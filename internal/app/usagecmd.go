package app

import (
	"encoding/json"
	"sort"

	"github.com/Synapse467/synapse-core/usage"
)

func init() {
	register("Records", "usage", "show your usage log, check it, or seal batches", cmdUsage)
}

type usageSummary struct {
	License  string `json:"license"`
	Allowed  int    `json:"allowed"`
	Denied   int    `json:"denied"`
	Batches  int    `json:"batches"`
	Unsealed int    `json:"unsealed"`
}

func summarise(log *usage.Log) []usageSummary {
	byLicense := map[string]*usageSummary{}
	for _, e := range log.Events() {
		s := byLicense[e.License]
		if s == nil {
			s = &usageSummary{License: e.License}
			byLicense[e.License] = s
		}
		if e.Allowed {
			s.Allowed++
		} else {
			s.Denied++
		}
	}
	var out []usageSummary
	for id, s := range byLicense {
		batches := log.Batches(id)
		s.Batches = len(batches)
		for _, b := range batches {
			s.Unsealed -= b.Count
		}
		s.Unsealed += s.Allowed
		out = append(out, *s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].License < out[j].License })
	return out
}

func cmdUsage(env *Env, args []string) error {
	fs := flags(env, "usage", "[seal] [options]")
	file := fs.String("log", "usage.jsonl", "which log in your Synapse folder to read (the gateway keeps one per capsule)")
	asJSON := fs.Bool("json", false, "machine-readable output")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	log, err := openUsageLog(*file)
	if err != nil {
		return err
	}
	if len(pos) == 1 && pos[0] == "seal" {
		return usageSeal(env, log)
	}
	if len(pos) > 0 {
		return usagef("expected `usage` or `usage seal`")
	}
	summary := summarise(log)
	if *asJSON {
		enc := json.NewEncoder(env.Out)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]any{"events": len(log.Events()), "intact": true, "licenses": summary})
	}
	env.printf("%s. The chain of hashes is intact: no entry has been changed, removed or reordered.\n", plural(len(log.Events()), "event", "events"))
	if len(summary) == 0 {
		env.println("Nothing has been recorded yet.")
		return nil
	}
	for _, s := range summary {
		env.printf("  %-34s %d allowed, %d refused, %s, %d not yet sealed\n", s.License, s.Allowed, s.Denied, plural(s.Batches, "batch", "batches"), s.Unsealed)
	}
	env.println("\nSeal new uses into a batch with `synapse usage seal`. A batch is one hash that can be recorded on Stellar with `synapse chain record`.")
	return nil
}

func usageSeal(env *Env, log *usage.Log) error {
	sealed := 0
	for _, s := range summarise(log) {
		if s.Unsealed == 0 || s.License == usage.OpenLicense {
			continue
		}
		b, err := log.Seal(s.License)
		if err != nil {
			return err
		}
		sealed++
		env.printf("license %s: batch %d covers %s, hash %s\n", s.License, b.Seq, plural(b.Count, "use", "uses"), b.Hash)
	}
	if sealed == 0 {
		env.println("Nothing new to seal.")
	}
	return nil
}
