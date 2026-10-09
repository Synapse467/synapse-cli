// Command synapse is the Synapse command line.
package main

import (
	"context"
	"os"
	"os/signal"

	"github.com/Synapse467/synapse-cli/internal/app"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	app.Version = version
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	os.Exit(app.Run(os.Args[1:], app.Env{In: os.Stdin, Out: os.Stdout, Err: os.Stderr, Interrupt: ctx}))
}
