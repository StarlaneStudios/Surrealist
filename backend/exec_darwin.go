//go:build darwin
// +build darwin

package backend

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func buildCommand(args []string) []string {
	return []string{
		"zsh",
		"-l",
		"-c",
		strings.Join(args, " "),
	}
}

func spawnInBackground(cmd *exec.Cmd) {
}

func killProcess(proc *os.Process) error {
	return exec.Command("kill", "-9", fmt.Sprint(proc.Pid)).Run()
}
