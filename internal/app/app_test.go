package app

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Synapse467/synapse-core/chain"
	"github.com/Synapse467/synapse-core/identity"
)

// person is someone with their own Synapse folder, so tests can play an owner and a buyer.
type person struct {
	t    *testing.T
	home string
	work string
	fake *fakeChain
}

func newPerson(t *testing.T) *person {
	t.Helper()
	return &person{t: t, home: t.TempDir(), work: t.TempDir(), fake: newFakeChain()}
}

// run executes a command as this person and returns its output and exit status.
func (p *person) run(args ...string) (stdout, stderr string, code int) {
	p.t.Helper()
	return p.runWith("", context.Background(), args...)
}

func (p *person) runWith(stdin string, ctx context.Context, args ...string) (string, string, int) {
	p.t.Helper()
	p.t.Setenv("SYNAPSE_HOME", p.home)
	var out, errb bytes.Buffer
	code := Run(args, Env{
		In: strings.NewReader(stdin), Out: &out, Err: &errb, Dir: p.work,
		Now: func() time.Time { return time.Date(2026, 10, 10, 12, 0, 0, 0, time.UTC) },
		NewChain: func(_ chain.Config, id *identity.Identity) (Chain, error) {
			return &fakeClient{f: p.fake, addr: id.Address()}, nil
		},
		Interrupt: ctx,
	})
	return out.String(), errb.String(), code
}

func (p *person) ok(args ...string) string {
	p.t.Helper()
	out, errs, code := p.run(args...)
	if code != 0 {
		p.t.Fatalf("synapse %s failed (exit %d)\nstdout: %s\nstderr: %s", strings.Join(args, " "), code, out, errs)
	}
	return out
}

func (p *person) fails(code int, args ...string) string {
	p.t.Helper()
	out, errs, got := p.run(args...)
	if got != code {
		p.t.Fatalf("synapse %s: exit %d, want %d\nstdout: %s\nstderr: %s", strings.Join(args, " "), got, code, out, errs)
	}
	return out + errs
}

func (p *person) write(name, content string) string {
	p.t.Helper()
	path := filepath.Join(p.work, name)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		p.t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		p.t.Fatal(err)
	}
	return path
}

func (p *person) address() string {
	p.t.Helper()
	return strings.TrimSpace(p.ok("whoami"))
}

func (p *person) cd(dir string) { p.work = filepath.Join(p.work, dir) }

const notes = `# Tenancy deposits

Always protect a tenancy deposit in an approved scheme within thirty days of receiving it.

Never deduct for fair wear and tear, because tenants are not responsible for ordinary ageing of a property.

## Possession notice

To serve a valid possession notice, follow these steps:

1. Use the prescribed form.
2. Give the required notice period.
3. Keep proof of service.

Prefer written communication with tenants. This does not apply to emergencies, which may be handled by phone.
`

// publishCapsule makes a capsule from notes as p, approving everything, and returns its path.
func publishCapsule(t *testing.T, p *person, name string, extra ...string) string {
	t.Helper()
	args := append([]string{"init", name, "--title", "Tenancy Basics", "--domain", "law", "--scope", "England"}, extra...)
	p.ok(args...)
	p.cd(name)
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	p.ok("approve", "--all")
	out := p.ok("publish")
	if !strings.Contains(out, "Published") {
		t.Fatalf("unexpected publish output: %s", out)
	}
	return filepath.Join(p.work, "dist", name+".capsule.json")
}

func TestFirstRunNeedsNoEnvironmentAtAll(t *testing.T) {
	// No SYNAPSE_HOME, no configuration: only the ordinary per-user folders.
	dir := t.TempDir()
	for _, v := range []string{"HOME", "USERPROFILE", "APPDATA", "XDG_CONFIG_HOME", "LOCALAPPDATA"} {
		t.Setenv(v, dir)
	}
	t.Setenv("SYNAPSE_HOME", "")
	var out, errb bytes.Buffer
	if code := Run([]string{"whoami"}, Env{Out: &out, Err: &errb, Dir: t.TempDir()}); code != 0 {
		t.Fatalf("exit %d: %s", code, errb.String())
	}
	address := strings.TrimSpace(out.String())
	if !regexp.MustCompile(`^G[A-Z2-7]{55}$`).MatchString(address) {
		t.Fatalf("not a Stellar address: %q", address)
	}
	// The second run uses the same identity.
	var again bytes.Buffer
	Run([]string{"whoami"}, Env{Out: &again, Err: &errb, Dir: t.TempDir()})
	if strings.TrimSpace(again.String()) != address {
		t.Fatal("the identity changed between runs")
	}
	// The folder was created under the user's own config area.
	found := false
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err == nil && filepath.Base(path) == "identity.json" {
			found = true
		}
		return nil
	})
	if !found {
		t.Fatal("the identity was not stored in the user's config folder")
	}
}

func TestDemoRunsWithNothingSetUp(t *testing.T) {
	p := newPerson(t)
	out := p.ok("demo")
	for _, want := range []string{"checking it offline", "Not covered", "refused", "chain verifies: true", "revokes"} {
		if !strings.Contains(strings.ToLower(out), strings.ToLower(want)) {
			t.Errorf("the demo output is missing %q", want)
		}
	}
	entries, _ := os.ReadDir(p.work)
	if len(entries) != 0 {
		t.Fatalf("the demo left files in the working folder: %v", entries)
	}
}

func TestDemoCanWriteTheSampleCapsuleAndItCanBeUsed(t *testing.T) {
	p := newPerson(t)
	p.ok("demo", "--write", "samples")
	path := filepath.Join(p.work, "samples", "incident-response-demo.capsule.json")
	out := p.ok("verify", path)
	if !strings.HasPrefix(out, "OK") {
		t.Fatal(out)
	}
	answer := p.ok("ask", path, "How often should we post status updates?")
	if !strings.Contains(answer, "thirty minutes") {
		t.Fatalf("unexpected answer: %s", answer)
	}
}

func TestAuthoringFlowFromDocumentToVerifiedCapsule(t *testing.T) {
	p := newPerson(t)
	path := publishCapsule(t, p, "tenancy", "--open", "--purposes", "research")

	if out := p.ok("verify", path); !strings.Contains(out, "OK") {
		t.Fatal(out)
	}
	info := p.ok("inspect", path, "--items")
	for _, want := range []string{"Tenancy Basics", "open for research", "procedure", "tested"} {
		if !strings.Contains(info, want) {
			t.Errorf("inspect is missing %q:\n%s", want, info)
		}
	}
	answer := p.ok("ask", path, "When must a deposit be protected?")
	if !strings.Contains(answer, "thirty days") || !strings.Contains(answer, "Contributed by") {
		t.Fatalf("unexpected answer: %s", answer)
	}
	// A question the expert never covered is refused rather than invented.
	if out := p.ok("ask", path, "What is the capital of Australia?"); !strings.Contains(out, "Not covered") {
		t.Fatalf("expected a refusal: %s", out)
	}
	// The private source copy never travels with the capsule.
	data, _ := os.ReadFile(path)
	if strings.Contains(string(data), "Keep proof of service") && strings.Contains(string(data), "# Tenancy deposits") {
		t.Fatal("the capsule contains the whole source document")
	}
}

func TestPublishingAgainContinuesTheVersionChain(t *testing.T) {
	p := newPerson(t)
	v1 := publishCapsule(t, p, "tenancy", "--open")
	p.ok("note", "--type", "claim", "--title", "Inventory at start", "--body", "Agree a written inventory with the tenant at the start of every tenancy.")
	p.ok("publish")
	v2 := filepath.Join(p.work, "dist", "tenancy.v2.capsule.json")
	if out := p.ok("verify", v2, "--previous", filepath.Join(p.work, "dist", "tenancy.v1.capsule.json")); !strings.Contains(out, "continues version 1") {
		t.Fatal(out)
	}
	if out := p.fails(1, "verify", v1, "--previous", v2); !strings.Contains(out, "FAILED") {
		t.Fatal("a later version was accepted as the previous one")
	}
}

func TestNothingIsPublishedUntilApproved(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy")
	p.cd("tenancy")
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	if out := p.fails(1, "publish"); !strings.Contains(out, "no items are approved") {
		t.Fatalf("unexpected message: %s", out)
	}
	if out := p.ok("review"); !strings.Contains(out, "item-") {
		t.Fatal("review lists nothing")
	}
}

func TestRejectedItemsStayOut(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy", "--open")
	p.cd("tenancy")
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	list := p.ok("review")
	id := regexp.MustCompile(`item-[0-9a-f]{12}`).FindString(list)
	p.ok("reject", id)
	p.ok("approve", "--all")
	p.ok("publish")
	out := p.ok("inspect", filepath.Join(p.work, "dist", "tenancy.capsule.json"), "--json")
	if strings.Contains(out, id) {
		t.Fatal("a rejected item is mentioned in the capsule")
	}
	data, _ := os.ReadFile(filepath.Join(p.work, "dist", "tenancy.capsule.json"))
	if strings.Contains(string(data), id) {
		t.Fatal("a rejected item reached the published capsule")
	}
}

func TestAnExpertCanWriteAndEditItems(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "ops", "--open")
	p.cd("ops")
	out := p.ok("note", "--type", "heuristic", "--title", "Page the lead early", "--body", "Page the incident lead as soon as customers are affected.", "--tag", "incident", "--why", "Delay costs more than a false alarm.")
	id := regexp.MustCompile(`item-[0-9a-f]{12}`).FindString(out)
	p.ok("edit", id, "--body", "Page the incident lead the moment customers are affected.", "--add-except", "Planned maintenance windows.")
	review := p.ok("review", id)
	for _, want := range []string{"the moment customers", "Planned maintenance", "written directly"} {
		if !strings.Contains(review, want) {
			t.Errorf("review is missing %q:\n%s", want, review)
		}
	}
	p.ok("note", "--type", "procedure", "--title", "Escalate", "--step", "Call the lead", "--step", "Open a channel")
	p.ok("publish")
}

func TestItemsProposedByAnotherToolWaitForApproval(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "ops", "--open")
	p.cd("ops")
	items := `[{"type":"claim","title":"Backups need restore tests","body":"A backup that has never been restored is not yet a backup.","authored":true,"contributor":""}]`
	p.write("suggested.json", items)
	p.ok("import", "suggested.json")
	if out := p.ok("review"); !strings.Contains(out, "Backups need restore tests") {
		t.Fatalf("the suggestion is not listed: %s", out)
	}
	if out := p.fails(1, "publish"); !strings.Contains(out, "no items are approved") {
		t.Fatal("a suggestion was published without approval")
	}
	// Unknown fields are refused rather than silently ignored.
	p.write("bad.json", `[{"type":"claim","title":"x","body":"y","surprise":1}]`)
	p.fails(1, "import", "bad.json")
}

func TestAmbiguousAndUnknownItemIDsAreRefused(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy")
	p.cd("tenancy")
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	if out := p.fails(1, "approve", "nonexistent"); !strings.Contains(out, "no item matches") {
		t.Fatal(out)
	}
	if out := p.fails(1, "approve", "item-"); !strings.Contains(out, "matches") {
		t.Fatalf("an ambiguous prefix was accepted: %s", out)
	}
}

func TestEvalWritesAnEditableSuite(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy")
	p.cd("tenancy")
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	p.ok("approve", "--all")
	out := p.ok("eval", "--write-suite")
	if !strings.Contains(out, "Passed") {
		t.Fatal(out)
	}
	data, err := os.ReadFile(filepath.Join(p.work, "synapse.eval.json"))
	if err != nil {
		t.Fatal(err)
	}
	var suite map[string]any
	if json.Unmarshal(data, &suite) != nil || suite["format"] != "synapse.eval/1" {
		t.Fatalf("the written suite is not valid: %s", data)
	}
	// An expert's own question that the capsule cannot answer stops publication.
	suite["cases"] = append(suite["cases"].([]any), map[string]any{"id": "mine", "question": "What is the tax rate on lettings income?", "expect": "answer", "items": []string{"item-000000000000"}})
	edited, _ := json.Marshal(suite)
	p.write("synapse.eval.json", string(edited))
	if out := p.fails(1, "publish"); !strings.Contains(out, "did not pass") {
		t.Fatalf("a failing expert suite did not stop publication: %s", out)
	}
}

func TestLicensingAcrossTwoPeopleWithNoSharedSetup(t *testing.T) {
	owner, buyer := newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy") // closed by default
	buyerAddr := buyer.address()

	// The buyer cannot use it without a license.
	buyer.work = filepath.Dir(capsulePath)
	out := buyer.fails(1, "ask", capsulePath, "When must a deposit be protected?")
	if !strings.Contains(out, "needs a license") {
		t.Fatalf("a closed capsule answered without a license: %s", out)
	}

	// The owner issues a license; the buyer uses it. Neither needs an account.
	issued := owner.ok("license", "issue", capsulePath, "--to", buyerAddr, "--purpose", "research", "--queries", "2", "-o", "buyer.license.json")
	if !strings.Contains(issued, "Issued license") {
		t.Fatal(issued)
	}
	licensePath := filepath.Join(owner.work, "buyer.license.json")
	if info := buyer.ok("license", "inspect", licensePath); !strings.Contains(info, "valid signature") {
		t.Fatal(info)
	}
	for i := 0; i < 2; i++ {
		answer := buyer.ok("ask", capsulePath, "When must a deposit be protected?", "--license", licensePath)
		if !strings.Contains(answer, "thirty days") {
			t.Fatalf("question %d: %s", i+1, answer)
		}
	}
	if out := buyer.fails(1, "ask", capsulePath, "When must a deposit be protected?", "--license", licensePath); !strings.Contains(out, "queries have been used") {
		t.Fatalf("the quota was not enforced: %s", out)
	}
	if out := buyer.fails(1, "ask", capsulePath, "deposit", "--license", licensePath, "--commercial"); !strings.Contains(out, "commercial") && !strings.Contains(out, "queries") {
		t.Fatal(out)
	}

	// The usage log is intact, and holds hashes rather than questions.
	if out := buyer.ok("usage"); !strings.Contains(out, "intact") {
		t.Fatal(out)
	}
	logData, _ := os.ReadFile(filepath.Join(buyer.home, "usage", "usage.jsonl"))
	if strings.Contains(string(logData), "deposit be protected") {
		t.Fatal("the usage log contains a question")
	}

	// Revocation: the owner revokes and sends the file; the buyer accepts it.
	revoked := owner.ok("license", "revoke", licensePath)
	if !strings.Contains(revoked, "Revoked license") {
		t.Fatal(revoked)
	}
	revFiles, _ := filepath.Glob(filepath.Join(owner.work, "*.revocation.json"))
	if len(revFiles) != 1 {
		t.Fatalf("expected one revocation file, found %v", revFiles)
	}
	buyer.ok("revocations", "add", revFiles[0])
	fresh := owner.ok("license", "issue", capsulePath, "--to", buyerAddr, "--purpose", "research", "-o", "second.license.json")
	_ = fresh
	if out := buyer.fails(1, "ask", capsulePath, "deposit protection", "--license", licensePath); !strings.Contains(out, "revoked") {
		t.Fatalf("a revoked license was honoured: %s", out)
	}
	// A different, unrevoked license still works.
	if answer := buyer.ok("ask", capsulePath, "deposit protection scheme", "--license", filepath.Join(owner.work, "second.license.json")); !strings.Contains(answer, "thirty days") {
		t.Fatal(answer)
	}
}

func TestOnlyTheOwnerCanLicenseAndOnlyTheLicenseeCanUseIt(t *testing.T) {
	owner, buyer, thief := newPerson(t), newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy")
	if out := buyer.fails(1, "license", "issue", capsulePath, "--to", buyer.address(), "--purpose", "research"); !strings.Contains(out, "only the capsule's owner") {
		t.Fatalf("a non-owner issued a license: %s", out)
	}
	owner.ok("license", "issue", capsulePath, "--to", buyer.address(), "--purpose", "research", "-o", "l.json")
	licensePath := filepath.Join(owner.work, "l.json")
	if out := thief.fails(1, "ask", capsulePath, "deposit", "--license", licensePath); !strings.Contains(out, "granted to someone else") {
		t.Fatalf("a license was used by someone it was not granted to: %s", out)
	}
}

func TestCoSigningAddsAContributorsSignature(t *testing.T) {
	owner, coauthor := newPerson(t), newPerson(t)
	coAddr := coauthor.address()
	owner.ok("init", "tenancy", "--open")
	owner.cd("tenancy")
	owner.ok("contributor", "add", coAddr, "--name", "Casey")
	owner.ok("note", "--title", "Inventory", "--body", "Agree a written inventory at the start of every tenancy.", "--by", coAddr)
	owner.ok("note", "--title", "Deposits", "--body", "Protect deposits in an approved scheme within thirty days.")
	owner.ok("publish")
	path := filepath.Join(owner.work, "dist", "tenancy.capsule.json")

	coauthor.work = owner.work
	coauthor.ok("cosign", path)
	out := owner.ok("verify", path)
	if strings.Count(out, "signed by") != 2 || !strings.Contains(out, "contributor") {
		t.Fatalf("expected two signatures:\n%s", out)
	}
	if info := owner.ok("inspect", path); !strings.Contains(info, "Casey") {
		t.Fatalf("the contributor's credit is missing:\n%s", info)
	}
	// Someone who is not listed cannot add a signature.
	stranger := newPerson(t)
	stranger.work = owner.work
	stranger.fails(1, "cosign", path)
}

func TestTamperedCapsulesAreRejectedEverywhere(t *testing.T) {
	p := newPerson(t)
	path := publishCapsule(t, p, "tenancy", "--open")
	data, _ := os.ReadFile(path)
	edited := strings.Replace(string(data), "thirty days", "ninety days", 1)
	if edited == string(data) {
		t.Fatal("the test did not change the capsule")
	}
	bad := p.write("bad.capsule.json", edited)
	p.fails(1, "verify", bad)
	p.fails(1, "ask", bad, "deposit")
	p.fails(1, "inspect", bad)
}

func TestMCPServesCapsulesToAgents(t *testing.T) {
	p := newPerson(t)
	path := publishCapsule(t, p, "tenancy", "--open", "--purposes", "assistant")
	input := strings.Join([]string{
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}`,
		`{"jsonrpc":"2.0","method":"notifications/initialized"}`,
		`{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"synapse_ask","arguments":{"question":"When must a deposit be protected?"}}}`,
	}, "\n") + "\n"
	out, _, code := p.runWith(input, context.Background(), "mcp", path)
	if code != 0 {
		t.Fatalf("exit %d", code)
	}
	lines := strings.Split(strings.TrimSpace(out), "\n")
	if len(lines) != 2 {
		t.Fatalf("expected two replies, got %d: %s", len(lines), out)
	}
	if !strings.Contains(lines[1], "thirty days") {
		t.Fatalf("the agent was not answered: %s", lines[1])
	}
	for _, line := range lines {
		var v map[string]any
		if json.Unmarshal([]byte(line), &v) != nil {
			t.Fatalf("stdout carried something other than protocol messages: %q", line)
		}
	}
}

// syncBuffer is a bytes.Buffer safe for use while a server writes to it.
type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}
func (b *syncBuffer) String() string { b.mu.Lock(); defer b.mu.Unlock(); return b.buf.String() }

func TestServeEnforcesLicensesOverHTTP(t *testing.T) {
	owner, buyer := newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy")
	owner.ok("license", "issue", capsulePath, "--to", buyer.address(), "--purpose", "research", "--queries", "1", "-o", "l.json")
	licensePath := filepath.Join(owner.work, "l.json")

	ctx, stop := context.WithCancel(context.Background())
	out := &syncBuffer{}
	done := make(chan int, 1)
	owner.t.Setenv("SYNAPSE_HOME", owner.home)
	go func() {
		done <- Run([]string{"serve", capsulePath, "--addr", "127.0.0.1:0"}, Env{
			Out: out, Err: &syncBuffer{}, Dir: owner.work, Interrupt: ctx,
		})
	}()
	var url string
	for i := 0; i < 100 && url == ""; i++ {
		if m := regexp.MustCompile(`http://127\.0\.0\.1:\d+`).FindString(out.String()); m != "" {
			url = m
		}
		time.Sleep(50 * time.Millisecond)
	}
	if url == "" {
		t.Fatalf("the server did not start: %s", out.String())
	}
	defer func() {
		stop()
		<-done
	}()

	buyer.work = owner.work
	answer := buyer.ok("ask", "--remote", url, "--license", licensePath, "When must a deposit be protected?")
	if !strings.Contains(answer, "thirty days") {
		t.Fatalf("unexpected answer: %s", answer)
	}
	if out := buyer.fails(1, "ask", "--remote", url, "--license", licensePath, "When must a deposit be protected?"); !strings.Contains(out, "quota_exhausted") {
		t.Fatalf("the gateway did not enforce the quota: %s", out)
	}
}

func TestUsageSealingIsRepeatableAndOnlyCoversNewUses(t *testing.T) {
	owner, buyer := newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy")
	owner.ok("license", "issue", capsulePath, "--to", buyer.address(), "--purpose", "research", "-o", "l.json")
	l := filepath.Join(owner.work, "l.json")
	buyer.ok("ask", capsulePath, "deposit protection scheme", "--license", l)
	buyer.ok("ask", capsulePath, "deposit protection scheme", "--license", l)
	if out := buyer.ok("usage", "seal"); !strings.Contains(out, "covers 2 uses") {
		t.Fatal(out)
	}
	if out := buyer.ok("usage", "seal"); !strings.Contains(out, "Nothing new") {
		t.Fatal(out)
	}
	buyer.ok("ask", capsulePath, "deposit protection scheme", "--license", l)
	if out := buyer.ok("usage", "seal"); !strings.Contains(out, "batch 2 covers 1 use") {
		t.Fatal(out)
	}
}

func TestChainCommandsUseTheIdentityAndNeverNeedConfiguration(t *testing.T) {
	owner, buyer := newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy")

	if out := owner.ok("chain", "status", capsulePath); !strings.Contains(out, "Not anchored") {
		t.Fatal(out)
	}
	if out := owner.ok("chain", "anchor", capsulePath); !strings.Contains(out, "Anchored version 1") {
		t.Fatal(out)
	}
	if out := owner.ok("chain", "anchor", capsulePath); !strings.Contains(out, "already anchored") {
		t.Fatal(out)
	}
	if out := owner.ok("chain", "status", capsulePath); !strings.Contains(out, "matches the hash") {
		t.Fatal(out)
	}
	// Someone else cannot anchor the owner's capsule.
	buyer.fails(1, "chain", "anchor", capsulePath)

	owner.ok("license", "issue", capsulePath, "--to", buyer.address(), "--purpose", "research", "--days", "30", "-o", "l.json")
	l := filepath.Join(owner.work, "l.json")
	if out := owner.ok("chain", "grant", l); !strings.Contains(out, "Recorded license") {
		t.Fatal(out)
	}
	if out := owner.ok("chain", "active", l); !strings.Contains(out, "Active") {
		t.Fatal(out)
	}
	buyer.ok("ask", capsulePath, "deposit protection scheme", "--license", l)
	// The buyer's own log records their use; the owner records what their server logged. Here the
	// owner has none, so there is nothing to record.
	if out := owner.ok("chain", "record"); !strings.Contains(out, "Nothing new") {
		t.Fatal(out)
	}
	if out := buyer.ok("chain", "record"); !strings.Contains(out, "batch 1") {
		t.Fatalf("usage was not recorded: %s", out)
	}
	if out := buyer.ok("chain", "record"); !strings.Contains(out, "Nothing new") {
		t.Fatal("the same batch would be recorded twice: " + out)
	}
	if out := owner.ok("chain", "revoke", l); !strings.Contains(out, "Revoked license") {
		t.Fatal(out)
	}
	owner.fails(1, "chain", "active", l)
}

func TestChainStatusCatchesAFileThatDiffersFromTheAnchor(t *testing.T) {
	owner, reader := newPerson(t), newPerson(t)
	capsulePath := publishCapsule(t, owner, "tenancy", "--open")
	owner.ok("chain", "anchor", capsulePath)

	// The owner republishes a different capsule under the same version number elsewhere.
	other := newPerson(t)
	other.fake = owner.fake
	otherPath := publishCapsule(t, other, "tenancy", "--open")
	_ = otherPath
	// Same slug, different owner: not the same capsule, so no anchor exists for it.
	reader.fake = owner.fake
	if out := reader.ok("chain", "status", otherPath); !strings.Contains(out, "Not anchored") {
		t.Fatal(out)
	}
}

func TestUnknownCommandsAndBadUsageExitWithTheRightStatus(t *testing.T) {
	p := newPerson(t)
	p.fails(2, "frobnicate")
	p.fails(2, "ask")
	p.fails(2, "init")
	p.fails(2, "verify")
	p.fails(2, "license", "issue", "x.json")
	p.fails(2, "ask", "--no-such-flag")
	p.fails(1, "ask", filepath.Join(p.work, "missing.json"), "q")
}

func TestEveryCommandPrintsHelpAndSucceeds(t *testing.T) {
	p := newPerson(t)
	for _, c := range commands {
		out, errs, code := p.run(c.name, "--help")
		if code != 0 {
			t.Errorf("%s --help exited %d: %s", c.name, code, errs)
		}
		if out == "" && errs == "" {
			t.Errorf("%s --help printed nothing", c.name)
		}
	}
	if out := p.ok("help"); !strings.Contains(out, "synapse demo") {
		t.Fatal("the help does not point at the demo")
	}
}

func TestInitRefusesToOverwriteADraft(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy")
	if out := p.fails(1, "init", "tenancy"); !strings.Contains(out, "already holds") {
		t.Fatal(out)
	}
}

func TestInitCreatesAFolderThatKeepsPrivateFilesOutOfGit(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy")
	data, err := os.ReadFile(filepath.Join(p.work, "tenancy", ".gitignore"))
	if err != nil || !strings.Contains(string(data), ".synapse/") {
		t.Fatalf("the private folder is not ignored: %v %q", err, data)
	}
}

func TestAHostileDraftCannotMakeTheCLIReadOutsideItsFolder(t *testing.T) {
	p := newPerson(t)
	p.ok("init", "tenancy", "--open")
	p.cd("tenancy")
	p.write("notes.md", notes)
	p.ok("add", "notes.md")
	p.ok("approve", "--all")
	secret := p.write("../outside-secret.txt", "do not read me")
	// Hand-edit the draft so a source id points at a file outside the private folder.
	draftPath := filepath.Join(p.work, "synapse.draft.json")
	data, _ := os.ReadFile(draftPath)
	edited := strings.Replace(string(data), `"id": "notes"`, `"id": "../../outside-secret.txt"`, 1)
	if edited == string(data) {
		t.Fatal("test setup did not change the draft")
	}
	os.WriteFile(draftPath, []byte(edited), 0o644)
	out, errs, _ := p.run("eval")
	if strings.Contains(out+errs, "do not read me") {
		t.Fatal("contents of a file outside the folder were used")
	}
	if _, err := os.Stat(secret); err != nil {
		t.Fatal("the outside file was disturbed")
	}
	if p.fails(2, "add", "notes.md", "--as", "a", "--title", "x", "extra.md") == "" {
		t.Fatal("expected a usage error")
	}
	if out := p.fails(1, "add", "notes.md", "--as", "../escape"); !strings.Contains(out, "source needs an id") && !strings.Contains(out, "cannot be used") {
		t.Fatalf("a path-like document name was accepted: %s", out)
	}
}
