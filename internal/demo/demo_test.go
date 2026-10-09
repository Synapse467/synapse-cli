package demo

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Synapse467/synapse-core/capsule"
	"github.com/Synapse467/synapse-engine/synapse"
)

func TestTheDemoCapsuleBuildsAndVerifies(t *testing.T) {
	c, err := Build()
	if err != nil {
		t.Fatal(err)
	}
	if r := capsule.Verify(c, nil); !r.OK {
		t.Fatalf("the demo capsule does not verify: %v", r.Issues)
	}
	if !c.Manifest.Evaluation.Passed || c.Manifest.Version != 1 {
		t.Fatalf("unexpected evaluation %+v", c.Manifest.Evaluation)
	}
}

func TestTheDemoCapsuleIsReproducible(t *testing.T) {
	a, err := Build()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := Build()
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	if !bytes.Equal(ja, jb) || a.Hash != b.Hash {
		t.Fatal("two builds of the demo capsule differ")
	}
}

func TestTheDemoCapsuleCoversEveryKindOfItem(t *testing.T) {
	c, _ := Build()
	seen := map[capsule.ItemType]bool{}
	for _, item := range c.Manifest.Knowledge {
		seen[item.Type] = true
	}
	for _, typ := range []capsule.ItemType{capsule.Procedure, capsule.Heuristic, capsule.Case} {
		if !seen[typ] {
			t.Errorf("the demo has no %s", typ)
		}
	}
}

func TestTheDemoAnswersAndRefuses(t *testing.T) {
	c, _ := Build()
	s, err := synapse.New(c)
	if err != nil {
		t.Fatal(err)
	}
	ask := func(q string) *synapse.Reply {
		r, err := s.Ask(q, synapse.Access{Purpose: "demo"})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	if r := ask("What do I do if health checks fail after a release?"); !r.Answered || !strings.Contains(r.Markdown, "previous") {
		t.Fatalf("the rollback question was not answered: %s", r.Markdown)
	}
	if r := ask("How often should we post status updates during an incident?"); !r.Answered || !strings.Contains(r.Markdown, "thirty minutes") {
		t.Fatalf("the communication question was not answered: %s", r.Markdown)
	}
	if r := ask("What is the capital of Australia?"); r.Answered {
		t.Fatal("the demo answered something it does not cover")
	}
}

func TestTheDemoCitationsPointAtTheEmbeddedRunbook(t *testing.T) {
	c, _ := Build()
	text := Runbook()
	n := 0
	for _, item := range c.Manifest.Knowledge {
		for _, cite := range item.Citations {
			n++
			if string(text[cite.Start:cite.End]) != cite.Quote {
				t.Fatalf("citation of %q is wrong", item.Title)
			}
		}
	}
	if n == 0 {
		t.Fatal("the demo capsule has no citations to show")
	}
}

func TestRunbookReturnsACopy(t *testing.T) {
	r := Runbook()
	r[0] = 'X'
	if Runbook()[0] == 'X' {
		t.Fatal("callers can modify the embedded document")
	}
}
