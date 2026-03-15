package main

import (
	"log"
	"net"
	"net/http"
	"os"
)

func main() {
	dir := "web"
	if argsDir := os.Getenv("STATIC_DIR"); argsDir != "" {
		dir = argsDir
	}

	port := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	addr := net.JoinHostPort("localhost", port)
	log.Printf("hosting %s on http://%s/", dir, addr)
	http.Handle("/", http.FileServer(http.Dir(dir)))
	// keep the listener bound to localhost for local experimentation
	log.Fatal(http.ListenAndServe(addr, nil))
}
