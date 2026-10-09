// Package app is the synapse command line: parsing, dispatch and output. The work itself is done by
// the core and engine libraries, so every command here can also be done from Go code.
package app

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Synapse467/synapse-core/chain"
	"github.com/Synapse467/synapse-core/identity"
)

// Version is set at build time.
var Version = "dev"

// Env is everything a command touches outside its arguments, so tests can run commands in a
// temporary directory with a fixed clock and a fake network.
type Env struct {
	In  io.Reader
	Out io.Writer
	Err io.Writer
	// Dir is the working directory. Defaults to the process's.
	Dir string
	Now func() time.Time
	// NewChain builds the Stellar client. Tests replace it; it defaults to the real one.
	NewChain func(cfg chain.Config, id *identity.Identity) (Chain, error)
	// Interrupt, when set, ends long-running commands such as serve and mcp.
	Interrupt context.Context
}

func (e *Env) fill() {
	if e.In == nil {
		e.In = strings.NewReader("")
	}
	if e.Out == nil {
		e.Out = io.Discard
	}
	if e.Err == nil {
		e.Err = io.Discard
	}
	if e.Dir == "" {
		e.Dir, _ = os.Getwd()
	}
	if e.Now == nil {
		e.Now = time.Now
	}
	if e.NewChain == nil {
		e.NewChain = func(cfg chain.Config, id *identity.Identity) (Chain, error) {
			return chain.New(cfg, id.Keypair())
		}
	}
	if e.Interrupt == nil {
		e.Interrupt = context.Background()
	}
}

func (e *Env) path(p string) string {
	if filepath.IsAbs(p) {
		return p
	}
	return filepath.Join(e.Dir, p)
}

func (e *Env) printf(format string, args ...any) { fmt.Fprintf(e.Out, format, args...) }
func (e *Env) println(args ...any)               { fmt.Fprintln(e.Out, args...) }

// usageError is a mistake in how a command was called; it exits with status 2.
type usageError struct{ msg string }

func (u usageError) Error() string { return u.msg }

func usagef(format string, args ...any) error { return usageError{fmt.Sprintf(format, args...)} }

type command struct {
	name    string
	summary string
	group   string
	run     func(*Env, []string) error
}

var commands []command

func register(group, name, summary string, run func(*Env, []string) error) {
	commands = append(commands, command{name: name, summary: summary, group: group, run: run})
}

func find(name string) *command {
	for i := range commands {
		if commands[i].name == name {
			return &commands[i]
		}
	}
	return nil
}

// Run executes one command line and returns the process exit status.
func Run(args []string, env Env) int {
	env.fill()
	if len(args) == 0 || args[0] == "help" || args[0] == "-h" || args[0] == "--help" {
		if len(args) > 1 {
			if c := find(args[1]); c != nil {
				_ = c.run(&env, []string{"--help"})
				return 0
			}
		}
		printHelp(&env)
		return 0
	}
	c := find(args[0])
	if c == nil {
		fmt.Fprintf(env.Err, "synapse: unknown command %q. Run `synapse help` to see what is available.\n", args[0])
		return 2
	}
	err := c.run(&env, args[1:])
	switch {
	case err == nil:
		return 0
	case errors.Is(err, flag.ErrHelp):
		return 0
	case errors.As(err, new(usageError)):
		fmt.Fprintf(env.Err, "synapse %s: %v\n", c.name, err)
		return 2
	default:
		fmt.Fprintf(env.Err, "synapse: %v\n", err)
		return 1
	}
}

var groupOrder = []string{"Try it", "Publish expertise", "Use expertise", "License", "Serve and integrate", "Records", "Stellar (optional)", "Other"}

func printHelp(env *Env) {
	env.println("Synapse: expertise you can ship.")
	env.println()
	env.println("A capsule is one signed file holding an expert's approved knowledge, with citations,")
	env.println("attribution and a record that it was tested. Nothing to configure, no account to make.")
	env.println()
	env.println("Start here:  synapse demo")
	byGroup := map[string][]command{}
	for _, c := range commands {
		byGroup[c.group] = append(byGroup[c.group], c)
	}
	for _, g := range groupOrder {
		list := byGroup[g]
		if len(list) == 0 {
			continue
		}
		env.printf("\n%s\n", g)
		for _, c := range list {
			env.printf("  %-18s %s\n", c.name, c.summary)
		}
	}
	env.println()
	env.println("Run `synapse help <command>` for a command's options.")
}

// flags creates a flag set that reports problems to the command's error stream.
func flags(env *Env, name, usage string) *flag.FlagSet {
	fs := flag.NewFlagSet("synapse "+name, flag.ContinueOnError)
	fs.SetOutput(env.Err)
	fs.Usage = func() {
		fmt.Fprintf(env.Err, "Usage: synapse %s %s\n\nOptions:\n", name, usage)
		fs.PrintDefaults()
	}
	return fs
}

// parse reads flags that may appear before, between or after positional arguments, which is how
// people naturally type them.
func parse(fs *flag.FlagSet, args []string) ([]string, error) {
	var positional []string
	for {
		if err := fs.Parse(args); err != nil {
			if errors.Is(err, flag.ErrHelp) {
				return nil, flag.ErrHelp
			}
			return nil, usageError{err.Error()}
		}
		rest := fs.Args()
		if len(rest) == 0 {
			return positional, nil
		}
		positional = append(positional, rest[0])
		args = rest[1:]
	}
}

// listFlag collects a repeatable flag.
type listFlag []string

func (l *listFlag) String() string     { return strings.Join(*l, ", ") }
func (l *listFlag) Set(v string) error { *l = append(*l, v); return nil }

func csv(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

func expect(positional []string, n int, usage string) error {
	if len(positional) != n {
		return usagef("expected %s", usage)
	}
	return nil
}

func plural(n int, one, many string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, one)
	}
	return fmt.Sprintf("%d %s", n, many)
}

func pct(bp int) string { return fmt.Sprintf("%d.%02d%%", bp/100, bp%100) }

func short(hash string) string {
	if len(hash) > 12 {
		return hash[:12]
	}
	return hash
}
