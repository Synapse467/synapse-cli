package app

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-engine/synapse"
)

func init() {
	register("License", "license", "issue, inspect or revoke licenses", cmdLicense)
	register("License", "revocations", "accept a revocation someone sent you", cmdRevocations)
}

func cmdLicense(env *Env, args []string) error {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" {
		env.println("Usage:")
		env.println("  synapse license issue <capsule> --to <address> --purpose <list> [options]")
		env.println("  synapse license inspect <license>")
		env.println("  synapse license revoke <license>")
		return nil
	}
	switch args[0] {
	case "issue":
		return licenseIssue(env, args[1:])
	case "inspect":
		return licenseInspect(env, args[1:])
	case "revoke":
		return licenseRevoke(env, args[1:])
	}
	return usagef("unknown license command %q; use issue, inspect or revoke", args[0])
}

func licenseIssue(env *Env, args []string) error {
	fs := flags(env, "license issue", "<capsule> --to <address> --purpose <list> [options]")
	to := fs.String("to", "", "the licensee's Synapse address (they run `synapse whoami`)")
	purposes := fs.String("purpose", "", "comma-separated purposes the license covers, for example research,education")
	days := fs.Int("days", 0, "valid for this many days (0: no expiry)")
	queries := fs.Int("queries", 0, "the most questions the licensee may ask (0: unlimited)")
	commercial := fs.Bool("commercial", false, "allow commercial use")
	training := fs.Bool("ai-training", false, "allow training AI models on the answers")
	derivative := fs.Bool("derivative", false, "allow derivative works")
	pin := fs.Bool("pin", false, "cover only this exact version of the capsule")
	note := fs.String("note", "", "a note for the licensee")
	out := fs.String("o", "", "where to write the license (default: derived from the capsule and licensee)")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a capsule file"); err != nil {
		return err
	}
	if *to == "" || *purposes == "" {
		return usagef("--to and --purpose are required")
	}
	if *days < 0 || *queries < 0 {
		return usagef("--days and --queries cannot be negative")
	}
	c, err := loadCapsule(env, pos[0])
	if err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	m := c.Raw.Manifest
	if id.Address() != m.Owner {
		return fmt.Errorf("only the capsule's owner (%s) can license it, and you are %s", m.Owner, id.Address())
	}
	terms := license.Terms{
		Capsule: license.CapsuleRef{Owner: m.Owner, Slug: m.Slug}, Grantee: *to, Purposes: csv(*purposes),
		Commercial: *commercial, AITraining: *training, Derivative: *derivative, MaxQueries: *queries, Note: *note,
	}
	if *pin {
		terms.Capsule.Hash = c.Raw.Hash
	}
	// No start time is set: a licensee whose clock runs a little behind must not be told a license is
	// "not yet valid". It takes effect as soon as it is issued.
	now := env.Now().UTC()
	if *days > 0 {
		terms.ExpiresAt = now.AddDate(0, 0, *days).Format(time.RFC3339)
	}
	l, err := license.Issue(terms, id)
	if err != nil {
		return err
	}
	path := *out
	if path == "" {
		path = fmt.Sprintf("%s.%s.license.json", m.Slug, strings.ToLower(l.Terms.Grantee[:8]))
	}
	path = env.path(path)
	if err := l.Save(path); err != nil {
		return err
	}
	env.printf("Issued license %s\n  file     %s\n  for      %s\n  covers   %s\n", l.Terms.ID, path, l.Terms.Grantee, describeTerms(l.Terms))
	env.println("\nSend the file to the licensee. They need no account: `synapse ask <capsule> \"...\" --license <file>`.")
	env.println("This is honour-system enforcement for a capsule file. To enforce limits yourself, serve it: `synapse serve`.")
	return nil
}

func describeTerms(t license.Terms) string {
	parts := []string{"purposes " + strings.Join(t.Purposes, "/")}
	if t.MaxQueries > 0 {
		parts = append(parts, plural(t.MaxQueries, "question", "questions"))
	} else {
		parts = append(parts, "unlimited questions")
	}
	if t.ExpiresAt != "" {
		parts = append(parts, "until "+t.ExpiresAt)
	}
	for flag, name := range map[bool]string{t.Commercial: "commercial use", t.AITraining: "AI training", t.Derivative: "derivative works"} {
		if flag {
			parts = append(parts, name)
		}
	}
	if t.Capsule.Hash != "" {
		parts = append(parts, "this exact version only")
	}
	return strings.Join(parts, "; ")
}

func licenseInspect(env *Env, args []string) error {
	fs := flags(env, "license inspect", "<license>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a license file"); err != nil {
		return err
	}
	l, err := license.Load(env.path(pos[0]))
	if err != nil {
		return err
	}
	status := "valid signature"
	if err := l.Verify(); err != nil {
		status = "INVALID: " + err.Error()
	}
	revoked, _ := loadRevocations()
	if revoked.Revoked(l) {
		status += "; REVOKED by the grantor"
	}
	env.printf("License %s (%s)\n  capsule   %s by %s\n  granted   %s → %s\n  covers    %s\n", l.Terms.ID, status,
		l.Terms.Capsule.Slug, l.Terms.Capsule.Owner, l.Terms.Grantor, l.Terms.Grantee, describeTerms(l.Terms))
	if l.Terms.Note != "" {
		env.printf("  note      %s\n", l.Terms.Note)
	}
	if err := l.Verify(); err != nil {
		return errors.New("the license is not valid")
	}
	return nil
}

func licenseRevoke(env *Env, args []string) error {
	fs := flags(env, "license revoke", "<license>")
	out := fs.String("o", "", "where to write the revocation (default: next to the license)")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a license file"); err != nil {
		return err
	}
	l, err := synapse.LoadLicense(env.path(pos[0]))
	if err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	rev, err := license.Revoke(l, id, env.Now())
	if err != nil {
		return err
	}
	set, err := loadRevocations()
	if err != nil {
		return err
	}
	if err := set.Add(*rev); err != nil {
		return err
	}
	path, err := homeFile(revokedFile)
	if err != nil {
		return err
	}
	if err := set.Save(path); err != nil {
		return err
	}
	file := *out
	if file == "" {
		file = filepath.Join(filepath.Dir(env.path(pos[0])), l.Terms.ID+".revocation.json")
	}
	if err := writeJSON(env.path(file), rev); err != nil {
		return err
	}
	env.printf("Revoked license %s. Servers you run (`synapse serve`) honour it immediately.\n  revocation file  %s\n", l.Terms.ID, env.path(file))
	env.println("Send that file to anyone who should stop honouring the license (they run `synapse revocations add`), or record it on Stellar with `synapse chain revoke`.")
	return nil
}

func cmdRevocations(env *Env, args []string) error {
	fs := flags(env, "revocations", "add <revocation-file>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) != 2 || pos[0] != "add" {
		return usagef("expected: revocations add <revocation-file>")
	}
	data, err := readFileLimited(env.path(pos[1]), 1<<20)
	if err != nil {
		return err
	}
	rev, err := parseRevocation(data)
	if err != nil {
		return err
	}
	set, err := loadRevocations()
	if err != nil {
		return err
	}
	if err := set.Add(*rev); err != nil {
		return fmt.Errorf("that revocation is not valid: %w", err)
	}
	path, err := homeFile(revokedFile)
	if err != nil {
		return err
	}
	if err := set.Save(path); err != nil {
		return err
	}
	env.printf("Recorded: license %s was revoked by %s.\n", rev.License, rev.Grantor)
	return nil
}
