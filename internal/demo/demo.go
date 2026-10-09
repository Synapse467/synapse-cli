// Package demo builds the sample capsule used by `synapse demo` and by the documentation.
//
// The capsule is built with exactly the pipeline an expert uses: a document is added, the items
// that are extracted from it are approved, the result is evaluated, and the capsule is signed.
// Everything is deterministic, so every build produces byte-for-byte the same capsule.
//
// The publisher key is derived from a public phrase. It exists only so that the demo capsule
// has a stable identity; it protects nothing and must never be used for anything real.
package demo

import (
	"crypto/sha256"
	_ "embed"
	"fmt"
	"strings"
	"time"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-core/identity"
	"github.com/Synapse467/synapse-engine/author"
	"github.com/Synapse467/synapse-engine/eval"
	"github.com/stellar/go-stellar-sdk/strkey"
)

//go:embed runbook.md
var runbook []byte

// SourceID names the embedded document in citations.
const SourceID = "demo-runbook"

// Runbook returns the document the demo capsule was built from.
func Runbook() []byte { return append([]byte(nil), runbook...) }

// Publisher returns the demo's public, well-known identity.
func Publisher() (*identity.Identity, error) {
	sum := sha256.Sum256([]byte("synapse demo publisher: public, for demonstration only"))
	seed, err := strkey.Encode(strkey.VersionByteSeed, sum[:])
	if err != nil {
		return nil, err
	}
	return identity.FromSeed(seed)
}

// Build returns the signed, open demo capsule published by the demo's well-known identity.
func Build() (*capsule.Capsule, error) {
	owner, err := Publisher()
	if err != nil {
		return nil, err
	}
	return BuildFor(owner, capsule.Policy{Open: true, Purposes: []string{"demo", "research", "education", "assistant"}})
}

// BuildFor builds the same capsule owned by someone else under a different policy, which is how
// the demo shows licensing: a closed copy that only a licensee can consult.
func BuildFor(owner *identity.Identity, policy capsule.Policy) (*capsule.Capsule, error) {
	d, err := capsule.NewDraft("incident-response-demo", "Incident Response for Small Teams (demo)", "operations", "small engineering teams", owner.Address())
	if err != nil {
		return nil, err
	}
	d.Contributors = []capsule.Contributor{{Address: owner.Address(), Name: "Synapse demo"}}
	d.Policy = policy
	if _, err := author.AddDocument(d, SourceID, "Demo runbook", runbook); err != nil {
		return nil, err
	}
	// The review step: approve what is useful and reject what the extractor should not have
	// proposed, here the runbook's own disclaimer.
	for _, item := range d.Items {
		review := d.Approve
		if strings.HasPrefix(item.Body, "This is a short, original runbook") {
			review = d.Reject
		}
		if err := review(item.ID); err != nil {
			return nil, err
		}
	}
	created := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	c, _, err := author.Publish(d, owner, nil, map[string][]byte{SourceID: runbook}, created, eval.DefaultThresholds)
	if err != nil {
		return nil, fmt.Errorf("demo: building the sample capsule failed: %w", err)
	}
	return c, nil
}
