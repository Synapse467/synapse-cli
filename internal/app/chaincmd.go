package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-core/chain"
	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-core/usage"
)

// Chain is the part of the Stellar client the commands use. *chain.Client implements it, and tests
// supply a fake so they never touch the network.
type Chain interface {
	Address() string
	EnsureFunded(ctx context.Context) error
	Anchor(ctx context.Context, capsuleRef string, version int, manifestHash, previousHash string) (*chain.Result, error)
	LatestAnchor(ctx context.Context, owner, capsuleRef string) (int, error)
	AnchoredHash(ctx context.Context, owner, capsuleRef string, version int) (string, bool, error)
	Grant(ctx context.Context, licenseRef, capsuleRef, grantee, termsHash string, expiresAt int64) (*chain.Result, error)
	Revoke(ctx context.Context, licenseRef string) (*chain.Result, error)
	LicenseActive(ctx context.Context, grantor, licenseRef string) (bool, error)
	RecordUsage(ctx context.Context, r chain.Receipt) (*chain.Result, error)
}

const explorer = "https://stellar.expert/explorer/testnet/tx/"

func init() {
	register("Stellar (optional)", "chain", "anchor versions, licenses and usage on Stellar (Testnet)", cmdChain)
}

func cmdChain(env *Env, args []string) error {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" {
		env.println("Everything in Synapse works without this. These commands add a public, independent record on Stellar Testnet,")
		env.println("using your Synapse identity. A new identity is funded automatically with test funds.")
		env.println()
		env.println("  synapse chain anchor <capsule>       timestamp a version, so no one can quietly publish a different one")
		env.println("  synapse chain status <capsule>       check a capsule against its anchor")
		env.println("  synapse chain grant <license>        record that you granted a license")
		env.println("  synapse chain revoke <license>       revoke it, publicly")
		env.println("  synapse chain active <license>       ask whether a license is currently granted and unrevoked")
		env.println("  synapse chain record                 record sealed usage batches")
		return nil
	}
	sub, rest := args[0], args[1:]
	fn := map[string]func(*Env, []string) error{
		"anchor": chainAnchor, "status": chainStatus, "grant": chainGrant, "revoke": chainRevoke, "active": chainActive, "record": chainRecord,
	}[sub]
	if fn == nil {
		return usagef("unknown chain command %q", sub)
	}
	return fn(env, rest)
}

func openChain(env *Env) (Chain, error) {
	id, err := identityFor(env)
	if err != nil {
		return nil, err
	}
	cfg, err := loadChainConfig()
	if err != nil {
		return nil, err
	}
	return env.NewChain(cfg, id)
}

func chainCtx(env *Env) (context.Context, context.CancelFunc) {
	return context.WithTimeout(env.Interrupt, 5*time.Minute)
}

func chainAnchor(env *Env, args []string) error {
	fs := flags(env, "chain anchor", "<capsule>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a capsule file"); err != nil {
		return err
	}
	c, err := loadCapsule(env, pos[0])
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	m := c.Raw.Manifest
	if cl.Address() != m.Owner {
		return fmt.Errorf("only the owner (%s) can anchor this capsule, and you are %s", m.Owner, cl.Address())
	}
	ctx, cancel := chainCtx(env)
	defer cancel()
	ref := capsule.Ref(m.Owner, m.Slug)
	latest, err := cl.LatestAnchor(ctx, m.Owner, ref)
	if err != nil {
		return err
	}
	switch {
	case latest >= m.Version:
		hash, ok, err := cl.AnchoredHash(ctx, m.Owner, ref, m.Version)
		if err != nil {
			return err
		}
		if ok && hash == c.Raw.Hash {
			env.printf("Version %d is already anchored, and matches this file.\n", m.Version)
			return nil
		}
		return fmt.Errorf("version %d is already anchored with a different hash; versions cannot be re-anchored", m.Version)
	case m.Version != latest+1:
		return fmt.Errorf("versions are anchored in order: version %d is next, and this file is version %d", latest+1, m.Version)
	}
	previous := strings.Repeat("0", 64)
	if m.Previous != "" {
		previous = m.Previous
	}
	env.println("Anchoring on Stellar Testnet…")
	res, err := cl.Anchor(ctx, ref, m.Version, c.Raw.Hash, previous)
	if err != nil {
		return err
	}
	env.printf("Anchored version %d of %q.\n  hash         %s\n  transaction  %s\n  see it       %s%s\n", m.Version, m.Title, c.Raw.Hash, res.TxHash, explorer, res.TxHash)
	return nil
}

func chainStatus(env *Env, args []string) error {
	fs := flags(env, "chain status", "<capsule>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a capsule file"); err != nil {
		return err
	}
	c, err := loadCapsule(env, pos[0])
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	m := c.Raw.Manifest
	ctx, cancel := chainCtx(env)
	defer cancel()
	ref := capsule.Ref(m.Owner, m.Slug)
	latest, err := cl.LatestAnchor(ctx, m.Owner, ref)
	if err != nil {
		return err
	}
	hash, ok, err := cl.AnchoredHash(ctx, m.Owner, ref, m.Version)
	if err != nil {
		return err
	}
	switch {
	case ok && hash == c.Raw.Hash:
		env.printf("Anchored. Version %d of %q matches the hash its owner recorded on Stellar.\n", m.Version, m.Title)
		if latest > m.Version {
			env.printf("Note: the owner has since anchored version %d. This file is not the newest.\n", latest)
		}
		return nil
	case ok:
		return fmt.Errorf("MISMATCH. The owner anchored a different version %d on Stellar (hash %s). Do not trust this file", m.Version, short(hash))
	case latest == 0:
		env.println("Not anchored. The owner has not recorded this capsule on Stellar. That is allowed, but nothing independent vouches for the version.")
		return nil
	default:
		env.printf("Version %d has not been anchored (the owner's latest anchored version is %d).\n", m.Version, latest)
		return nil
	}
}

func loadLicenseFile(env *Env, path string) (*license.License, error) {
	l, err := license.Load(env.path(path))
	if err != nil {
		return nil, err
	}
	if err := l.Verify(); err != nil {
		return nil, err
	}
	return l, nil
}

func chainGrant(env *Env, args []string) error {
	fs := flags(env, "chain grant", "<license>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a license file"); err != nil {
		return err
	}
	l, err := loadLicenseFile(env, pos[0])
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	if cl.Address() != l.Terms.Grantor {
		return fmt.Errorf("only the grantor (%s) can record this license", l.Terms.Grantor)
	}
	var expires int64
	if l.Terms.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, l.Terms.ExpiresAt)
		if err != nil {
			return err
		}
		expires = t.Unix()
	}
	ctx, cancel := chainCtx(env)
	defer cancel()
	res, err := cl.Grant(ctx, l.Ref(), capsule.Ref(l.Terms.Capsule.Owner, l.Terms.Capsule.Slug), l.Terms.Grantee, l.Hash, expires)
	if err != nil {
		return err
	}
	env.printf("Recorded license %s on Stellar.\n  transaction  %s\n  see it       %s%s\n", l.Terms.ID, res.TxHash, explorer, res.TxHash)
	return nil
}

func chainRevoke(env *Env, args []string) error {
	fs := flags(env, "chain revoke", "<license>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a license file"); err != nil {
		return err
	}
	l, err := loadLicenseFile(env, pos[0])
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	if cl.Address() != l.Terms.Grantor {
		return fmt.Errorf("only the grantor (%s) can revoke this license", l.Terms.Grantor)
	}
	ctx, cancel := chainCtx(env)
	defer cancel()
	res, err := cl.Revoke(ctx, l.Ref())
	if err != nil {
		return err
	}
	env.printf("Revoked license %s on Stellar.\n  transaction  %s\n  see it       %s%s\n", l.Terms.ID, res.TxHash, explorer, res.TxHash)
	env.println("Also run `synapse license revoke` so your own servers refuse it at once.")
	return nil
}

func chainActive(env *Env, args []string) error {
	fs := flags(env, "chain active", "<license>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a license file"); err != nil {
		return err
	}
	l, err := loadLicenseFile(env, pos[0])
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	ctx, cancel := chainCtx(env)
	defer cancel()
	active, err := cl.LicenseActive(ctx, l.Terms.Grantor, l.Ref())
	if err != nil {
		return err
	}
	if !active {
		env.println("Not active on Stellar: it was never recorded, has expired, or was revoked.")
		return errors.New("license is not active")
	}
	env.println("Active on Stellar: recorded by the grantor, not revoked, not expired.")
	return nil
}

func chainRecord(env *Env, args []string) error {
	fs := flags(env, "chain record", "[options]")
	file := fs.String("log", "usage.jsonl", "which log in your Synapse folder to record")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) > 0 {
		return usagef("chain record takes no arguments")
	}
	log, err := openUsageLog(*file)
	if err != nil {
		return err
	}
	cl, err := openChain(env)
	if err != nil {
		return err
	}
	statePath, err := homeFile("usage", recordedFile)
	if err != nil {
		return err
	}
	recorded := map[string]int{}
	if data, err := os.ReadFile(statePath); err == nil {
		if err := json.Unmarshal(data, &recorded); err != nil {
			return fmt.Errorf("%s is not valid: %w", statePath, err)
		}
	}
	ctx, cancel := chainCtx(env)
	defer cancel()
	n := 0
	for _, s := range summarise(log) {
		if s.License == usage.OpenLicense {
			continue
		}
		if s.Unsealed > 0 {
			if _, err := log.Seal(s.License); err != nil {
				return err
			}
		}
		for _, b := range log.Batches(s.License) {
			if b.Seq <= recorded[s.License] {
				continue
			}
			res, err := cl.RecordUsage(ctx, chain.Receipt{
				LicenseRef: license.RefOf(s.License), Seq: b.Seq, BatchHash: b.Hash, PreviousHex: b.Previous,
				Count: b.Count, PeriodStart: b.PeriodStart, PeriodEnd: b.PeriodEnd,
			})
			if err != nil {
				return err
			}
			recorded[s.License] = b.Seq
			if err := writeJSON(statePath, recorded); err != nil {
				return err
			}
			n++
			env.printf("license %s batch %d (%s): %s%s\n", s.License, b.Seq, plural(b.Count, "use", "uses"), explorer, res.TxHash)
		}
	}
	if n == 0 {
		env.println("Nothing new to record.")
	}
	return nil
}
