package app

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/Synapse467/synapse-core/license"
	"github.com/Synapse467/synapse-engine/gateway"
	"github.com/Synapse467/synapse-engine/mcpserver"
	"github.com/Synapse467/synapse-engine/synapse"
)

func init() {
	register("Serve and integrate", "serve", "serve a capsule over HTTP, enforcing its licenses", cmdServe)
	register("Serve and integrate", "mcp", "let AI agents (Claude, Cursor...) consult capsules as a tool", cmdMCP)
}

func cmdServe(env *Env, args []string) error {
	fs := flags(env, "serve", "<capsule> [options]")
	addr := fs.String("addr", "127.0.0.1:8787", "address to listen on")
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
	log, err := openUsageLog("gateway-" + c.Raw.Manifest.Slug + ".jsonl")
	if err != nil {
		return err
	}
	handler, err := gateway.New(gateway.Config{
		Capsule: c, Log: log,
		Revocations: func() (license.RevocationSet, error) { return loadRevocations() },
		Now:         env.Now,
	})
	if err != nil {
		return err
	}
	listener, err := net.Listen("tcp", *addr)
	if err != nil {
		return err
	}
	server := &http.Server{
		Handler: handler, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second,
		WriteTimeout: 60 * time.Second, IdleTimeout: 2 * time.Minute, MaxHeaderBytes: 1 << 16,
	}
	url := "http://" + listener.Addr().String()
	i := c.Info()
	env.printf("Serving %q v%d at %s\n", i.Title, i.Version, url)
	if i.Open {
		env.println("It is open: anyone may ask within its policy.")
	} else {
		env.println("It needs a license: every question must be signed by a licensee, and limits are enforced here.")
	}
	env.printf("Ask it:  synapse ask --remote %s --license <license-file> \"your question\"\n", url)
	env.printf("Usage is recorded in %s (question hashes only).\n", "your Synapse folder")
	if host, _, _ := net.SplitHostPort(listener.Addr().String()); host != "127.0.0.1" && host != "::1" {
		env.println("Note: this listens beyond your own machine and speaks plain HTTP. Put it behind TLS before exposing it.")
	}

	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	select {
	case err := <-done:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-env.Interrupt.Done():
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return server.Shutdown(ctx)
	}
}

func cmdMCP(env *Env, args []string) error {
	fs := flags(env, "mcp", "<capsule>... [options]")
	licensePath := fs.String("license", "", "a license file to use for capsules that are not open")
	purpose := fs.String("purpose", "assistant", "the purpose stated for questions the agent asks")
	pos, err := parse(fs, args)
	if err != nil {
		return err
	}
	if len(pos) == 0 {
		return usagef("expected at least one capsule file")
	}
	id, err := identityFor(env)
	if err != nil {
		return err
	}
	var lic *license.License
	if *licensePath != "" {
		if lic, err = synapse.LoadLicense(env.path(*licensePath)); err != nil {
			return err
		}
	}
	log, err := openUsageLog("usage.jsonl")
	if err != nil {
		return err
	}
	server := &mcpserver.Server{Name: "synapse", Version: Version, DefaultPurpose: *purpose}
	for _, p := range pos {
		c, err := loadCapsule(env, p)
		if err != nil {
			return err
		}
		server.Capsules = append(server.Capsules, c)
	}
	server.Access = func(c *synapse.Capsule, p string) synapse.Access {
		revoked, _ := loadRevocations()
		a := synapse.Access{Purpose: p, Grantee: id.Address(), Revoked: revoked, Log: log, Now: env.Now()}
		if lic != nil && lic.Terms.Capsule.Slug == c.Raw.Manifest.Slug && lic.Terms.Capsule.Owner == c.Raw.Manifest.Owner {
			a.License = lic
		}
		return a
	}
	fmt.Fprintf(env.Err, "synapse mcp: serving %s on standard input and output\n", plural(len(server.Capsules), "capsule", "capsules"))
	return server.Serve(env.Interrupt, env.In, env.Out)
}
