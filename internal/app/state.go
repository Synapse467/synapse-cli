package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-core/chain"
	"github.com/Synapse467/synapse-core/home"
	"github.com/Synapse467/synapse-core/identity"
	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-core/usage"
	"github.com/Synapse467/synapse-engine/eval"
	"github.com/Synapse467/synapse-engine/synapse"
)

// Names of the files a workspace and the user's home hold. Everything is a plain file.
const (
	suiteFile    = "synapse.eval.json"
	privateDir   = ".synapse"
	sourcesDir   = "sources"
	distDir      = "dist"
	revokedFile  = "revocations.json"
	chainFile    = "chain.json"
	recordedFile = "chain-recorded.json"
)

// identityFor loads the user's identity, creating it on first use. This is the whole "sign up":
// a key is made on this machine and nothing is sent anywhere.
func identityFor(env *Env) (*identity.Identity, error) {
	id, created, err := identity.LoadOrCreate(identity.DefaultPath())
	if err != nil {
		return nil, err
	}
	if created {
		fmt.Fprintf(env.Err, "Created your Synapse identity %s\nIt is stored at %s. Back that file up: it is what signs your capsules and licenses.\n\n", id.Address(), identity.DefaultPath())
	}
	return id, nil
}

func homeFile(parts ...string) (string, error) {
	dir, err := home.Ensure(parts[:len(parts)-1]...)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, parts[len(parts)-1]), nil
}

func openUsageLog(name string) (*usage.Log, error) {
	path, err := homeFile("usage", name)
	if err != nil {
		return nil, err
	}
	return usage.Open(path)
}

func loadRevocations() (license.RevocationSet, error) {
	path, err := homeFile(revokedFile)
	if err != nil {
		return nil, err
	}
	return license.LoadRevocations(path)
}

// loadChainConfig returns the default Testnet deployment, unless the user has chosen to point at
// another by creating chain.json. The file is optional and there is no way to need it.
func loadChainConfig() (chain.Config, error) {
	cfg := chain.Testnet()
	path, err := homeFile(chainFile)
	if err != nil {
		return cfg, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return cfg, nil
	}
	if err != nil {
		return cfg, err
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return cfg, fmt.Errorf("%s is not valid: %w", path, err)
	}
	return cfg, cfg.Validate()
}

// workspace is a directory holding a draft capsule and its private working files.
type workspace struct{ dir string }

func (w workspace) draft() (*capsule.Draft, error) {
	d, err := capsule.LoadDraft(w.dir)
	if errors.Is(err, os.ErrNotExist) {
		return nil, errors.New("there is no capsule draft here. Run `synapse init <name>` to start one, or change into its folder")
	}
	return d, err
}

// safeID reports whether a source ID is a plain file name. IDs in a draft file come from disk, so
// a hand-edited or hostile draft must not be able to point outside the private folder.
func safeID(id string) bool {
	return id != "" && filepath.IsLocal(id) && id == filepath.Base(id) && !strings.ContainsAny(id, "/\\")
}

func (w workspace) sourcePath(id string) string {
	return filepath.Join(w.dir, privateDir, sourcesDir, id)
}

func (w workspace) saveSource(id string, text []byte) error {
	if !safeID(id) {
		return fmt.Errorf("%q cannot be used as a document name", id)
	}
	path := w.sourcePath(id)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	return os.WriteFile(path, text, 0o600)
}

// sourceTexts loads the private copies of the draft's sources. A missing copy is not an error:
// citations are then checked against their recorded hashes only, and the caller is told.
func (w workspace) sourceTexts(d *capsule.Draft) (texts map[string][]byte, missing []string) {
	texts = map[string][]byte{}
	for _, s := range d.Sources {
		if !safeID(s.ID) {
			missing = append(missing, s.ID)
			continue
		}
		data, err := os.ReadFile(w.sourcePath(s.ID))
		if err != nil {
			missing = append(missing, s.ID)
			continue
		}
		texts[s.ID] = data
	}
	return texts, missing
}

func (w workspace) suite() (*eval.Suite, error) {
	data, err := os.ReadFile(filepath.Join(w.dir, suiteFile))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var s eval.Suite
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("%s is not valid: %w", suiteFile, err)
	}
	return &s, s.Validate()
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

var slugCleaner = regexp.MustCompile(`[^a-z0-9]+`)

// sourceID derives a source ID from a file name.
func sourceID(path string) string {
	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	id := strings.Trim(slugCleaner.ReplaceAllString(strings.ToLower(base), "-"), "-")
	if id == "" {
		id = "source"
	}
	return id
}

// resolve finds a draft item by its full ID or by a unique prefix.
func resolve(d *capsule.Draft, ref string) (string, error) {
	var matches []string
	for _, item := range d.Items {
		if item.ID == ref {
			return item.ID, nil
		}
		if strings.HasPrefix(item.ID, ref) || strings.HasPrefix(strings.TrimPrefix(item.ID, "item-"), ref) {
			matches = append(matches, item.ID)
		}
	}
	switch len(matches) {
	case 0:
		return "", fmt.Errorf("no item matches %q", ref)
	case 1:
		return matches[0], nil
	default:
		return "", fmt.Errorf("%q matches %d items; use more characters", ref, len(matches))
	}
}

// loadCapsule opens a capsule file and verifies it. Errors say what is wrong with the file.
func loadCapsule(env *Env, path string) (*synapse.Capsule, error) {
	c, err := synapse.Open(env.path(path))
	if err != nil {
		return nil, err
	}
	return c, nil
}
