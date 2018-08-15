package wrongname

import "testing"

func TestHello(t *testing.T) {
	f := Hello()

	if f != "World" {
		t.Error("Dis be cray cray")
	}
}
