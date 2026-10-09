package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-core/identity"
	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-engine/gateway"
	"github.com/Synapse467/synapse-engine/retrieve"
	"github.com/Synapse467/synapse-engine/synapse"
)

func init() {
	register("Try it", "demo", "see a capsule answer, refuse, resist tampering and enforce a license", cmdDemo)
	register("Try it", "whoami", "show your identity (made on first use)", cmdWhoami)
	register("Use expertise", "inspect", "summarise a capsule", cmdInspect)
	register("Use expertise", "verify", "check a capsule's integrity and signatures, offline", cmdVerify)
	register("Use expertise", "ask", "ask a capsule a question", cmdAsk)
	register("Use expertise", "cosign", "add your signature to a capsule you contributed to", cmdCosign)
	register("Other", "version", "print the version", func(env *Env, _ []string) error {
		env.printf("synapse %s\n", Version)
		return nil
	})
}

func cmdWhoami(env *Env, args []string) error {
	fs := flags(env, "whoami", "")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	env.printf("%s\n", id.Address())
	fmt.Fprintf(env.Err, "This is your Synapse identity. Share the address freely; keep %s private.\n", identity.DefaultPath())
	return nil
}

func cmdInspect(env *Env, args []string) error {
	fs := flags(env, "inspect", "<capsule> [options]")
	asJSON := fs.Bool("json", false, "machine-readable output")
	items := fs.Bool("items", false, "list the items' titles")
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
	if *asJSON {
		enc := json.NewEncoder(env.Out)
		enc.SetIndent("", "  ")
		return enc.Encode(c.Info())
	}
	m := c.Raw.Manifest
	i := c.Info()
	env.printf("%s (version %d)\n", m.Title, m.Version)
	env.printf("  field       %s — %s\n  owner       %s\n  hash        %s\n  published   %s\n", m.Domain, m.Scope, m.Owner, c.Raw.Hash, m.CreatedAt)
	byType := map[capsule.ItemType]int{}
	for _, item := range m.Knowledge {
		byType[item.Type]++
	}
	var parts []string
	for _, t := range capsule.ValidTypes {
		if byType[t] > 0 {
			parts = append(parts, fmt.Sprintf("%d %s", byType[t], t))
		}
	}
	env.printf("  contents    %s\n", strings.Join(parts, ", "))
	e := m.Evaluation
	env.printf("  tested      %d questions: covers %s, refuses %s, citations %s, credit %s\n", e.Cases, pct(e.CoverageBP), pct(e.AbstentionBP), pct(e.CitationValidityBP), pct(e.AttributionBP))
	env.printf("  signed by   %s\n", plural(len(c.Report.Signers), "signer", "signers"))
	for addr, n := range c.Report.Contributions {
		name := ""
		for _, p := range m.Contributors {
			if p.Address == addr && p.Name != "" {
				name = " (" + p.Name + ")"
			}
		}
		env.printf("  contributor %s%s: %s\n", addr, name, plural(n, "item", "items"))
	}
	p := m.Policy
	if i.Open {
		env.printf("  access      open for %s", strings.Join(p.Purposes, ", "))
		if p.Commercial {
			env.print(", commercial use allowed")
		}
		env.println()
	} else {
		env.println("  access      needs a license from the owner")
	}
	if *items {
		env.println()
		for _, item := range m.Knowledge {
			env.printf("  %-9s %s\n", item.Type, item.Title)
		}
	}
	return nil
}

func (e *Env) print(args ...any) { fmt.Fprint(e.Out, args...) }

func cmdVerify(env *Env, args []string) error {
	fs := flags(env, "verify", "<capsule> [options]")
	previous := fs.String("previous", "", "the earlier version, to check this one continues it")
	asJSON := fs.Bool("json", false, "machine-readable output")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a capsule file"); err != nil {
		return err
	}
	c, err := capsule.Load(env.path(pos[0]))
	if err != nil {
		return err
	}
	var prev *capsule.Capsule
	if *previous != "" {
		if prev, err = capsule.Load(env.path(*previous)); err != nil {
			return err
		}
	}
	report := capsule.Verify(c, prev)
	if *asJSON {
		enc := json.NewEncoder(env.Out)
		enc.SetIndent("", "  ")
		if err := enc.Encode(report); err != nil {
			return err
		}
	} else if report.OK {
		env.printf("OK  %q version %d, owned by %s\n    hash %s\n", c.Manifest.Title, report.Version, report.Owner, report.Hash)
		for _, s := range report.Signers {
			env.printf("    signed by %s (%s)\n", s.Address, s.Role)
		}
		if prev != nil {
			env.printf("    continues version %d\n", prev.Manifest.Version)
		}
	} else {
		env.printf("FAILED  %s\n", pos[0])
		for _, issue := range report.Issues {
			env.printf("  - %s\n", issue)
		}
	}
	if !report.OK {
		return errors.New("verification failed")
	}
	return nil
}

func cmdAsk(env *Env, args []string) error {
	fs := flags(env, "ask", "<capsule> \"<question>\" [options]   or   --remote <url> \"<question>\"")
	licensePath := fs.String("license", "", "your license file, for a capsule that is not open")
	purpose := fs.String("purpose", "", "what the answer is for (default: the first purpose allowed)")
	remote := fs.String("remote", "", "ask a capsule served elsewhere (synapse serve) instead of a file")
	commercial := fs.Bool("commercial", false, "the answer will be used commercially")
	training := fs.Bool("ai-training", false, "the answer will be used to train an AI model")
	derivative := fs.Bool("derivative", false, "the answer will be used to make a derivative work")
	noLog := fs.Bool("no-log", false, "do not record this use in your usage log")
	asJSON := fs.Bool("json", false, "machine-readable output")
	nearest := fs.Bool("suggest", false, "when a question is not covered, list the closest topics")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	var lic *license.License
	if *licensePath != "" {
		if lic, err = synapse.LoadLicense(env.path(*licensePath)); err != nil {
			return err
		}
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}

	if *remote != "" {
		if err := expect(pos, 1, "a question"); err != nil {
			return err
		}
		p := *purpose
		if p == "" {
			p = firstPurpose(nil, lic)
		}
		ctx, cancel := context.WithTimeout(env.Interrupt, 30*time.Second)
		defer cancel()
		reply, err := gateway.Client{BaseURL: *remote}.Ask(ctx, id, lic, p, pos[0], gateway.Use{Commercial: *commercial, AITraining: *training, Derivative: *derivative})
		if err != nil {
			return err
		}
		return printReply(env, reply, *asJSON)
	}

	if err := expect(pos, 2, "a capsule file and a question"); err != nil {
		return err
	}
	c, err := loadCapsule(env, pos[0])
	if err != nil {
		return err
	}
	revoked, err := loadRevocations()
	if err != nil {
		return err
	}
	access := synapse.Access{
		Purpose: *purpose, Grantee: id.Address(), License: lic, Revoked: revoked,
		Commercial: *commercial, AITraining: *training, Derivative: *derivative, Now: env.Now(),
		Retrieval: retrieve.Options{Suggest: *nearest},
	}
	if access.Purpose == "" {
		access.Purpose = firstPurpose(c, lic)
	}
	if !*noLog {
		if access.Log, err = openUsageLog("usage.jsonl"); err != nil {
			return err
		}
	} else if lic != nil && lic.Terms.MaxQueries > 0 {
		return errors.New("this license has a query limit, so uses must be recorded; remove --no-log")
	}
	reply, err := c.Ask(pos[1], access)
	if err != nil {
		return err
	}
	if err := printReply(env, reply, *asJSON); err != nil {
		return err
	}
	if !reply.Decision.Allowed {
		return fmt.Errorf("not allowed (%s)", reply.Decision.Code)
	}
	return nil
}

func printReply(env *Env, reply *synapse.Reply, asJSON bool) error {
	if asJSON {
		enc := json.NewEncoder(env.Out)
		enc.SetIndent("", "  ")
		return enc.Encode(reply)
	}
	env.print(reply.Markdown)
	if reply.Decision.Allowed && reply.Decision.Remaining >= 0 {
		env.printf("\n(%s left on this license)\n", plural(reply.Decision.Remaining, "question", "questions"))
	}
	return nil
}

// firstPurpose picks a sensible default purpose so the common case needs no flag.
func firstPurpose(c *synapse.Capsule, lic *license.License) string {
	if lic != nil && len(lic.Terms.Purposes) > 0 {
		return lic.Terms.Purposes[0]
	}
	if c != nil && len(c.Raw.Manifest.Policy.Purposes) > 0 {
		return c.Raw.Manifest.Policy.Purposes[0]
	}
	return "research"
}

func cmdCosign(env *Env, args []string) error {
	fs := flags(env, "cosign", "<capsule>")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a capsule file"); err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	path := env.path(pos[0])
	c, err := capsule.Load(path)
	if err != nil {
		return err
	}
	if err := c.CoSign(id); err != nil {
		return err
	}
	if report := capsule.Verify(c, nil); !report.OK {
		return fmt.Errorf("the capsule does not verify after signing: %s", report.Issues[0])
	}
	if err := c.Save(path); err != nil {
		return err
	}
	env.printf("Signed %s as %s. Your signature confirms the items credited to you are yours and are as you wrote them.\n", filepath.Base(path), id.Address())
	return nil
}

// ---- demo ----

func cmdDemo(env *Env, args []string) error {
	fs := flags(env, "demo", "[options]")
	write := fs.String("write", "", "also write the demo capsule into this folder, to try the other commands on")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) > 0 {
		return usagef("demo takes no arguments")
	}
	return runDemo(env, *write)
}

func step(env *Env, n int, title string) {
	env.printf("\n%d. %s\n", n, title)
}

func indent(text string) string {
	lines := strings.Split(strings.TrimRight(text, "\n"), "\n")
	for i, l := range lines {
		lines[i] = "   " + l
	}
	return strings.Join(lines, "\n")
}
