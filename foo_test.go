package wrongname

import "testing"

func TestHello(t *testing.T) {
	f := Hello()

	if f != "Woorld" {
		t.Error("Dis be cray cray")
	}
}
