package app

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-engine/author"
	"github.com/Synapse467/synapse-engine/eval"
)

func init() {
	register("Publish expertise", "init", "start a new capsule in a folder", cmdInit)
	register("Publish expertise", "add", "add documents; proposes items for you to review", cmdAdd)
	register("Publish expertise", "note", "write an item of your own directly", cmdNote)
	register("Publish expertise", "import", "add items proposed by another tool or AI agent (JSON)", cmdImport)
	register("Publish expertise", "review", "list items awaiting your decision", cmdReview)
	register("Publish expertise", "approve", "approve items so they can be published", cmdApprove)
	register("Publish expertise", "reject", "reject items so they never enter a capsule", cmdReject)
	register("Publish expertise", "edit", "change an item, which also approves it", cmdEdit)
	register("Publish expertise", "contributor", "list a co-author whose items are credited to them", cmdContributor)
	register("Publish expertise", "eval", "test the capsule before publishing", cmdEval)
	register("Publish expertise", "publish", "evaluate, sign and write the capsule file", cmdPublish)
}

func cmdInit(env *Env, args []string) error {
	fs := flags(env, "init", "<name> [options]")
	title := fs.String("title", "", "human-readable title (default: the name)")
	domain := fs.String("domain", "general", "the field this expertise belongs to")
	scope := fs.String("scope", "", "what the expertise covers, and where it applies")
	open := fs.Bool("open", false, "let anyone consult the capsule without a license")
	purposes := fs.String("purposes", "research,education", "purposes allowed without a license (with --open)")
	commercial := fs.Bool("commercial", false, "allow commercial use without a license (with --open)")
	training := fs.Bool("ai-training", false, "allow training AI models on answers without a license (with --open)")
	derivative := fs.Bool("derivative", false, "allow derivative works without a license (with --open)")
	dir := fs.String("dir", "", "folder to create (default: the name)")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a name, for example: synapse init tenancy-law"); err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	folder := *dir
	if folder == "" {
		folder = pos[0]
	}
	folder = env.path(folder)
	if _, err := os.Stat(filepath.Join(folder, capsule.DraftFile)); err == nil {
		return fmt.Errorf("%s already holds a capsule draft", folder)
	}
	t := *title
	if t == "" {
		t = pos[0]
	}
	d, err := capsule.NewDraft(pos[0], t, *domain, *scope, id.Address())
	if err != nil {
		return err
	}
	d.Policy = capsule.Policy{Open: *open, Commercial: *commercial, AITraining: *training, Derivative: *derivative}
	if *open {
		d.Policy.Purposes = csv(*purposes)
	}
	if err := d.Save(folder); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(folder, ".gitignore"), []byte(privateDir+"/\n"), 0o644); err != nil {
		return err
	}
	env.printf("Started %q in %s\nOwner: %s\n\n", t, folder, id.Address())
	env.println("Next:")
	env.printf("  cd %s\n  synapse add your-notes.md      # propose items from a document\n  synapse review                 # see what was proposed\n  synapse approve --all          # or approve one by one\n  synapse publish                # test, sign and write the capsule\n", filepath.Base(folder))
	return nil
}

func cmdAdd(env *Env, args []string) error {
	fs := flags(env, "add", "<file>... [options]")
	as := fs.String("as", "", "name this document in citations (only with one file; default: from the file name)")
	title := fs.String("title", "", "title of the document (only with one file; default: the file name)")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) == 0 {
		return usagef("expected at least one file, for example: synapse add notes.md")
	}
	if (*as != "" || *title != "") && len(pos) > 1 {
		return usagef("--as and --title work with a single file")
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	for _, file := range pos {
		text, err := os.ReadFile(env.path(file))
		if err != nil {
			return err
		}
		if len(text) > 8<<20 {
			return fmt.Errorf("%s is larger than 8 MB; split it into smaller documents", file)
		}
		id := *as
		if id == "" {
			id = sourceID(file)
		}
		name := *title
		if name == "" {
			name = filepath.Base(file)
		}
		got, err := author.AddDocument(d, id, name, text)
		if err != nil {
			return fmt.Errorf("%s: %w", file, err)
		}
		if err := w.saveSource(id, text); err != nil {
			return err
		}
		env.printf("%s: %s proposed, %d already in the draft, %d passages could not be used\n",
			file, plural(got.Proposed, "item", "items"), got.Existing, got.Skipped)
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	counts := d.Counts()
	env.printf("\n%d waiting for your decision. Run `synapse review`.\n", counts[capsule.Pending])
	env.println("Your documents stay on this machine: the capsule records only their hashes and the short quotes you approve.")
	return nil
}

func cmdNote(env *Env, args []string) error {
	fs := flags(env, "note", "--title <title> --body <text> [options]")
	typ := fs.String("type", "claim", "claim, procedure, heuristic, exception or case")
	title := fs.String("title", "", "short title (required)")
	body := fs.String("body", "", "the guidance itself")
	why := fs.String("why", "", "the reasoning behind it")
	limits := fs.String("limits", "", "where it stops applying")
	by := fs.String("by", "", "credit another listed contributor (their address)")
	pending := fs.Bool("pending", false, "leave it for review instead of approving it now")
	var steps, conditions, exceptions, appliesTo, tags listFlag
	fs.Var(&steps, "step", "a step of a procedure (repeat for each step)")
	fs.Var(&conditions, "when", "a condition under which it applies (repeatable)")
	fs.Var(&exceptions, "except", "an exception (repeatable)")
	fs.Var(&appliesTo, "applies-to", "for an exception: the item or tag it qualifies (repeatable)")
	fs.Var(&tags, "tag", "a topic tag (repeatable)")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	item := capsule.Item{
		Type: capsule.ItemType(*typ), Title: *title, Body: *body, Steps: steps, Conditions: conditions, Exceptions: exceptions,
		AppliesTo: appliesTo, Tags: tags, Rationale: *why, Limitations: *limits, Contributor: *by, Authored: true,
	}
	entry, err := d.Propose(item, "authored")
	if err != nil {
		return err
	}
	status := "pending"
	if !*pending {
		if err := d.Approve(entry.ID); err != nil {
			return err
		}
		status = "approved"
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	env.printf("Added %s (%s): %s\n", entry.ID, status, entry.Title)
	return nil
}

func cmdImport(env *Env, args []string) error {
	fs := flags(env, "import", "<items.json | ->")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "a JSON file of items, or - to read standard input"); err != nil {
		return err
	}
	var data []byte
	if pos[0] == "-" {
		data, err = io.ReadAll(io.LimitReader(env.In, 8<<20))
	} else {
		data, err = os.ReadFile(env.path(pos[0]))
	}
	if err != nil {
		return err
	}
	var items []capsule.Item
	dec := json.NewDecoder(strings.NewReader(string(data)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&items); err != nil {
		return fmt.Errorf("the items are not valid: %w", err)
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	added, skipped := 0, 0
	for i, item := range items {
		if _, err := d.Propose(item, "suggested"); err != nil {
			skipped++
			env.printf("item %d skipped: %v\n", i+1, err)
			continue
		}
		added++
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	env.printf("%s added for your review, %d skipped. Nothing is published until you approve it.\n", plural(added, "item", "items"), skipped)
	return nil
}

func cmdReview(env *Env, args []string) error {
	fs := flags(env, "review", "[id] [options]")
	status := fs.String("status", "pending", "pending, approved, rejected or all")
	full := fs.Bool("full", false, "show each item in full, with its citations")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	d, err := (workspace{env.Dir}).draft()
	if err != nil {
		return err
	}
	var show []capsule.DraftItem
	if len(pos) > 0 {
		for _, ref := range pos {
			id, err := resolve(d, ref)
			if err != nil {
				return err
			}
			for _, item := range d.Items {
				if item.ID == id {
					show = append(show, item)
				}
			}
		}
		*full = true
	} else {
		for _, item := range d.Items {
			if *status == "all" || string(item.Status) == *status {
				show = append(show, item)
			}
		}
	}
	if len(show) == 0 {
		counts := d.Counts()
		env.printf("Nothing to show. %d approved, %d pending, %d rejected.\n", counts[capsule.Approved], counts[capsule.Pending], counts[capsule.Rejected])
		return nil
	}
	for _, item := range show {
		if !*full {
			env.printf("%s  %-9s %-8s %s\n", item.ID, item.Type, item.Status, item.Title)
			continue
		}
		printItem(env, item.Item, string(item.Status))
	}
	if !*full {
		env.println("\nShow one in full with `synapse review <id>`. Approve with `synapse approve <id>` or `synapse approve --all`.")
	}
	return nil
}

func printItem(env *Env, item capsule.Item, status string) {
	env.printf("%s  [%s, %s]\n  %s\n", item.ID, item.Type, status, item.Title)
	if item.Body != "" {
		env.printf("\n  %s\n", item.Body)
	}
	for i, s := range item.Steps {
		env.printf("  %d. %s\n", i+1, s)
	}
	for _, s := range item.Conditions {
		env.printf("  when: %s\n", s)
	}
	for _, s := range item.Exceptions {
		env.printf("  except: %s\n", s)
	}
	if item.Rationale != "" {
		env.printf("  why: %s\n", item.Rationale)
	}
	for _, c := range item.Citations {
		env.printf("  > %q (%s, bytes %d-%d)\n", c.Quote, c.Source, c.Start, c.End)
	}
	if item.Authored {
		env.println("  written directly by the expert")
	}
	env.println()
}

func decide(env *Env, name string, args []string, apply func(*capsule.Draft, string) error, verb string) error {
	fs := flags(env, name, "<id>... | --all")
	all := fs.Bool("all", false, "every item still pending")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	var ids []string
	if *all {
		if len(pos) > 0 {
			return usagef("--all cannot be combined with item ids")
		}
		for _, item := range d.Items {
			if item.Status == capsule.Pending {
				ids = append(ids, item.ID)
			}
		}
	} else {
		if len(pos) == 0 {
			return usagef("name the items to %s, or use --all", name)
		}
		for _, ref := range pos {
			id, err := resolve(d, ref)
			if err != nil {
				return err
			}
			ids = append(ids, id)
		}
	}
	for _, id := range ids {
		if err := apply(d, id); err != nil {
			return err
		}
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	counts := d.Counts()
	env.printf("%s %s. Now %d approved, %d pending, %d rejected.\n", verb, plural(len(ids), "item", "items"), counts[capsule.Approved], counts[capsule.Pending], counts[capsule.Rejected])
	return nil
}

func cmdApprove(env *Env, args []string) error {
	return decide(env, "approve", args, (*capsule.Draft).Approve, "Approved")
}

func cmdReject(env *Env, args []string) error {
	return decide(env, "reject", args, (*capsule.Draft).Reject, "Rejected")
}

func cmdEdit(env *Env, args []string) error {
	fs := flags(env, "edit", "<id> [options]")
	title := fs.String("title", "", "new title")
	body := fs.String("body", "", "new body")
	why := fs.String("why", "", "new reasoning")
	limits := fs.String("limits", "", "new limits")
	var addTags, addExcept, addWhen listFlag
	fs.Var(&addTags, "add-tag", "add a tag (repeatable)")
	fs.Var(&addExcept, "add-except", "add an exception (repeatable)")
	fs.Var(&addWhen, "add-when", "add a condition (repeatable)")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if err := expect(pos, 1, "one item id"); err != nil {
		return err
	}
	d, err := (workspace{env.Dir}).draft()
	if err != nil {
		return err
	}
	id, err := resolve(d, pos[0])
	if err != nil {
		return err
	}
	err = d.Edit(id, func(item *capsule.Item) {
		if *title != "" {
			item.Title = *title
		}
		if *body != "" {
			item.Body = *body
		}
		if *why != "" {
			item.Rationale = *why
		}
		if *limits != "" {
			item.Limitations = *limits
		}
		item.Tags = append(item.Tags, addTags...)
		item.Exceptions = append(item.Exceptions, addExcept...)
		item.Conditions = append(item.Conditions, addWhen...)
	})
	if err != nil {
		return err
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	env.printf("Updated and approved %s. The original proposal is kept in the draft.\n", id)
	return nil
}

func cmdContributor(env *Env, args []string) error {
	fs := flags(env, "contributor", "add <address> [--name <name>] | list")
	name := fs.String("name", "", "the contributor's display name")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	if len(pos) == 1 && pos[0] == "list" || len(pos) == 0 {
		env.printf("owner  %s\n", d.Owner)
		for _, c := range d.Contributors {
			env.printf("       %s  %s\n", c.Address, c.Name)
		}
		return nil
	}
	if len(pos) != 2 || pos[0] != "add" {
		return usagef("expected: contributor add <address>, or contributor list")
	}
	for _, c := range d.Contributors {
		if c.Address == pos[1] {
			return errors.New("that contributor is already listed")
		}
	}
	d.Contributors = append(d.Contributors, capsule.Contributor{Address: pos[1], Name: *name})
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	env.printf("Listed %s. Credit their items with `synapse note --by %s`; they sign the published file with `synapse cosign`.\n", pos[1], pos[1])
	return nil
}

func cmdEval(env *Env, args []string) error {
	fs := flags(env, "eval", "[options]")
	suitePath := fs.String("suite", "", "a suite file of your own questions (default: "+suiteFile+" if present, else a generated one)")
	write := fs.Bool("write-suite", false, "write the generated suite to "+suiteFile+" so you can edit it")
	asJSON := fs.Bool("json", false, "machine-readable output")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	suite, err := loadSuite(env, w, *suitePath)
	if err != nil {
		return err
	}
	texts, missing := w.sourceTexts(d)
	report, used, err := author.Evaluate(d, suite, texts, eval.DefaultThresholds)
	if err != nil {
		return err
	}
	if *write {
		if err := writeJSON(filepath.Join(env.Dir, suiteFile), used); err != nil {
			return err
		}
	}
	if *asJSON {
		enc := json.NewEncoder(env.Out)
		enc.SetIndent("", "  ")
		return enc.Encode(report)
	}
	printReport(env, report, suite != nil, missing)
	if *write {
		env.printf("\nWrote %s. Add your own questions to it: an evaluation you wrote is stronger than a generated one.\n", suiteFile)
	}
	if !report.Evaluation.Passed {
		return errors.New("the capsule does not pass its evaluation yet")
	}
	return nil
}

func loadSuite(env *Env, w workspace, path string) (*eval.Suite, error) {
	if path == "" {
		return w.suite()
	}
	data, err := os.ReadFile(env.path(path))
	if err != nil {
		return nil, err
	}
	var s eval.Suite
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("%s is not a valid suite: %w", path, err)
	}
	return &s, s.Validate()
}

func printReport(env *Env, r eval.Report, expertSuite bool, missing []string) {
	e := r.Evaluation
	kind := "generated suite"
	if expertSuite {
		kind = "your suite"
	}
	env.printf("Evaluation (%s, %d questions)\n", kind, e.Cases)
	env.printf("  answers what it covers   %s  (needs %s)\n", pct(e.CoverageBP), pct(eval.DefaultThresholds.Coverage))
	env.printf("  refuses what it doesn't  %s  (needs %s)\n", pct(e.AbstentionBP), pct(eval.DefaultThresholds.Abstention))
	env.printf("  citations check out      %s  (needs %s)\n", pct(e.CitationValidityBP), pct(eval.DefaultThresholds.CitationValidity))
	env.printf("  credit is attached       %s  (needs %s)\n", pct(e.AttributionBP), pct(eval.DefaultThresholds.Attribution))
	if len(missing) > 0 {
		env.printf("\nNote: the original text of %s is not in this folder, so its quotes were checked against their hashes only.\n", strings.Join(missing, ", "))
	}
	for _, f := range r.Failures {
		env.printf("  - %s: %s\n", f.Case, f.Reason)
	}
	if e.Passed {
		env.println("\nPassed.")
	} else {
		env.println("\nNot passing yet.")
	}
}

func cmdPublish(env *Env, args []string) error {
	fs := flags(env, "publish", "[options]")
	out := fs.String("out", distDir, "folder to write the capsule into")
	suitePath := fs.String("suite", "", "a suite file of your own questions")
	if _, err := parse(fs, args); err != nil {
		return err
	}
	w := workspace{env.Dir}
	d, err := w.draft()
	if err != nil {
		return err
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	suite, err := loadSuite(env, w, *suitePath)
	if err != nil {
		return err
	}
	texts, missing := w.sourceTexts(d)
	c, report, err := author.Publish(d, id, suite, texts, env.Now(), eval.DefaultThresholds)
	if err != nil {
		if len(report.Failures) > 0 || report.Evaluation.Cases > 0 {
			printReport(env, report, suite != nil, missing)
		}
		return err
	}
	versioned := filepath.Join(env.path(*out), fmt.Sprintf("%s.v%d.capsule.json", c.Manifest.Slug, c.Manifest.Version))
	latest := filepath.Join(env.path(*out), c.Manifest.Slug+".capsule.json")
	for _, p := range []string{versioned, latest} {
		if err := c.Save(p); err != nil {
			return err
		}
	}
	if err := d.Save(env.Dir); err != nil {
		return err
	}
	env.printf("Published %q version %d\n", c.Manifest.Title, c.Manifest.Version)
	env.printf("  file     %s\n  hash     %s\n  items    %d\n  owner    %s\n", latest, c.Hash, len(c.Manifest.Knowledge), c.Manifest.Owner)
	env.printf("  tested   %d questions, all thresholds met\n\n", report.Evaluation.Cases)
	env.println("Share the file. Whoever receives it can check it with `synapse verify`, with no account.")
	env.println("Next: `synapse ask <file> \"question\"`, `synapse license issue`, `synapse serve`, or `synapse chain anchor` to timestamp it on Stellar.")
	return nil
}
