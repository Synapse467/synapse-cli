package app

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/Synapse467/synapse-cli/internal/demo"
	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-core/identity"
	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-core/usage"
	"github.com/Synapse467/synapse-engine/synapse"
)

// runDemo walks through everything Synapse does, using a sample capsule. It writes nothing to the
// user's machine except, if asked, the sample capsule itself: keys, licenses and logs it makes are
// throwaway and live in memory or a temporary folder.
func runDemo(env *Env, writeTo string) error {
	open, err := demo.Build()
	if err != nil {
		return err
	}
	env.println("Synapse demo: expertise you can ship. Nothing here needs an account, a key you manage, or a network.")

	step(env, 1, "A capsule is one signed file. Checking it offline:")
	c, err := synapse.New(open)
	if err != nil {
		return err
	}
	i := c.Info()
	env.printf("   %q v%d, %d items, hash %s\n   signed by %s\n   tested on %d questions before it was published\n",
		i.Title, i.Version, i.Items, short(i.Hash), c.Report.Signers[0].Address, i.Evaluation.Cases)

	step(env, 2, "Ask it something it covers. The answer is the expert's own approved words, cited:")
	r, err := c.Ask("What should I do if health checks fail after a release?", synapse.Access{Purpose: "demo"})
	if err != nil {
		return err
	}
	env.println(indent(r.Markdown))

	step(env, 3, "Ask it something it does not cover. It says so instead of guessing:")
	r, err = c.Ask("What is the best programming language?", synapse.Access{Purpose: "demo"})
	if err != nil {
		return err
	}
	env.println(indent(r.Markdown))

	step(env, 4, "Change one word of the file and it stops working:")
	data, err := json.Marshal(open)
	if err != nil {
		return err
	}
	tampered := strings.Replace(string(data), "thirty minutes", "three hours", 1)
	if _, err := synapse.Parse([]byte(tampered)); err != nil {
		env.printf("   refused: %v\n", err)
	} else {
		return fmt.Errorf("demo: a tampered capsule was accepted")
	}

	step(env, 5, "Licensing. A different owner publishes the same capsule as closed. No license, no answer:")
	owner, err := identity.Generate()
	if err != nil {
		return err
	}
	buyer, err := identity.Generate()
	if err != nil {
		return err
	}
	closedCapsule, err := demo.BuildFor(owner, capsule.Policy{})
	if err != nil {
		return err
	}
	closed, err := synapse.New(closedCapsule)
	if err != nil {
		return err
	}
	dir, err := os.MkdirTemp("", "synapse-demo-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(dir)
	log, err := usage.Open(filepath.Join(dir, "usage.jsonl"))
	if err != nil {
		return err
	}
	question := "How often should we post status updates during an incident?"
	r, err = closed.Ask(question, synapse.Access{Purpose: "research", Log: log, Now: env.Now()})
	if err != nil {
		return err
	}
	env.printf("   without a license: %s (%s)\n", r.Decision.Reason, r.Decision.Code)

	lic, err := license.Issue(license.Terms{
		Capsule:  license.CapsuleRef{Owner: owner.Address(), Slug: closedCapsule.Manifest.Slug},
		Grantee:  buyer.Address(),
		Purposes: []string{"research"}, MaxQueries: 2,
	}, owner)
	if err != nil {
		return err
	}
	env.printf("\n   The owner signs a license file for a buyer: research only, 2 questions, no commercial use.\n")
	access := synapse.Access{Purpose: "research", Grantee: buyer.Address(), License: lic, Log: log, Now: env.Now()}
	for n := 1; n <= 3; n++ {
		r, err = closed.Ask(question, access)
		if err != nil {
			return err
		}
		if r.Decision.Allowed {
			env.printf("   question %d: answered (%d left)\n", n, r.Decision.Remaining)
		} else {
			env.printf("   question %d: refused, %s\n", n, r.Decision.Reason)
		}
	}
	access.Commercial = true
	r, _ = closed.Ask(question, access)
	env.printf("   commercial use: refused, %s\n", r.Decision.Reason)
	access.Commercial = false
	access.Grantee = owner.Address()
	r, _ = closed.Ask(question, access)
	env.printf("   someone else using the buyer's license: refused, %s\n", r.Decision.Reason)

	rev, err := license.Revoke(lic, owner, env.Now())
	if err != nil {
		return err
	}
	set := license.RevocationSet{}
	if err := set.Add(*rev); err != nil {
		return err
	}
	r, _ = closed.Ask(question, synapse.Access{Purpose: "research", Grantee: buyer.Address(), License: lic, Log: log, Now: env.Now(), Revoked: set})
	env.printf("   after the owner revokes it: refused, %s\n", r.Decision.Reason)

	step(env, 6, "Every use is recorded in a tamper-evident log. It holds hashes of questions, never the questions:")
	env.printf("   %s, chain verifies: %v\n", plural(len(log.Events()), "event", "events"), log.Verify() == nil)
	batch, err := log.Seal(lic.Terms.ID)
	if err != nil {
		return err
	}
	env.printf("   %s sealed into one batch %s. That hash is what can optionally be recorded on Stellar.\n", plural(batch.Count, "billable use", "billable uses"), short(batch.Hash))

	if writeTo != "" {
		folder := env.path(writeTo)
		path := filepath.Join(folder, open.Manifest.Slug+".capsule.json")
		if err := open.Save(path); err != nil {
			return err
		}
		env.printf("\nWrote %s\n", path)
		env.printf("Try it:  synapse ask %s \"How do we handle retries?\"\n", path)
	}
	env.println("\nNext:")
	env.println("  synapse init my-expertise      start your own capsule")
	env.println("  synapse demo --write .         save the sample capsule and try ask / serve / mcp on it")
	return nil
}
