package app

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/Synapse467/synapse-core/chain"
)

// fakeChain is an in-memory stand-in for the Soroban contracts, with the same rules they enforce.
// One instance can be shared between people, like the real chain.
type fakeChain struct {
	mu       sync.Mutex
	anchors  map[string]string // owner|ref|version -> hash
	latest   map[string]int
	licenses map[string]bool // grantor|ref -> active
	usage    map[string]int  // owner|ref -> receipts
	n        int
}

func newFakeChain() *fakeChain {
	return &fakeChain{anchors: map[string]string{}, latest: map[string]int{}, licenses: map[string]bool{}, usage: map[string]int{}}
}

type fakeClient struct {
	f    *fakeChain
	addr string
}

func (c *fakeClient) Address() string                        { return c.addr }
func (c *fakeClient) EnsureFunded(ctx context.Context) error { return nil }
func (c *fakeClient) res() *chain.Result {
	c.f.n++
	return &chain.Result{TxHash: fmt.Sprintf("tx%062d", c.f.n), Ledger: uint32(c.f.n)}
}

func (c *fakeClient) Anchor(ctx context.Context, ref string, version int, hash, previous string) (*chain.Result, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	key := c.addr + "|" + ref
	if version != c.f.latest[key]+1 {
		return nil, errors.New("the contract rejected the call: version out of order")
	}
	c.f.latest[key] = version
	c.f.anchors[fmt.Sprintf("%s|%d", key, version)] = hash
	return c.res(), nil
}

func (c *fakeClient) LatestAnchor(ctx context.Context, owner, ref string) (int, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	return c.f.latest[owner+"|"+ref], nil
}

func (c *fakeClient) AnchoredHash(ctx context.Context, owner, ref string, version int) (string, bool, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	h, ok := c.f.anchors[fmt.Sprintf("%s|%s|%d", owner, ref, version)]
	return h, ok, nil
}

func (c *fakeClient) Grant(ctx context.Context, licenseRef, capsuleRef, grantee, terms string, expires int64) (*chain.Result, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	c.f.licenses[c.addr+"|"+licenseRef] = true
	return c.res(), nil
}

func (c *fakeClient) Revoke(ctx context.Context, licenseRef string) (*chain.Result, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	key := c.addr + "|" + licenseRef
	if !c.f.licenses[key] {
		return nil, errors.New("not found")
	}
	c.f.licenses[key] = false
	return c.res(), nil
}

func (c *fakeClient) LicenseActive(ctx context.Context, grantor, licenseRef string) (bool, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	return c.f.licenses[grantor+"|"+licenseRef], nil
}

func (c *fakeClient) RecordUsage(ctx context.Context, r chain.Receipt) (*chain.Result, error) {
	c.f.mu.Lock()
	defer c.f.mu.Unlock()
	key := c.addr + "|" + r.LicenseRef
	if r.Seq != c.f.usage[key]+1 {
		return nil, errors.New("the contract rejected the call: receipt out of order")
	}
	c.f.usage[key] = r.Seq
	return c.res(), nil
}
