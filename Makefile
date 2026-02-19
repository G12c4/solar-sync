.PHONY: build run dev shell clean

build:
	nix build

run:
	nix run

dev:
	nix develop -c npm run dev

shell:
	nix develop

clean:
	rm -rf result
