package app

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/Synapse467/synapse-core/license"
)

func readFileLimited(path string, limit int64) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("%s is larger than %d bytes", path, limit)
	}
	return data, nil
}

func parseRevocation(data []byte) (*license.Revocation, error) {
	var rev license.Revocation
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&rev); err != nil {
		return nil, errors.New("that file is not a revocation")
	}
	if err := rev.Verify(); err != nil {
		return nil, fmt.Errorf("that revocation is not valid: %w", err)
	}
	return &rev, nil
}
