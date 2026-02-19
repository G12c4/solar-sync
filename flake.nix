{
  description = "Solar Sync - React/Vite application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        pkg = pkgs.buildNpmPackage {
          pname = "solar-sync";
          version = "0.0.0";

          src = ./.;

          npmDepsHash = "sha256-GfkjmAKziEunOyH9i4uRix9FhmfjUo2+o1Oi/VzvOao=";

          buildPhase = ''
            npm run build
          '';

          installPhase = ''
            mkdir -p $out/share/solar-sync
            cp -r dist/* $out/share/solar-sync/
          '';
        };
      in {
        packages.default = pkg;

        apps.default = {
          type = "app";
          program = "${pkgs.writeShellScript "serve-solar-sync" ''
            ${pkgs.python3}/bin/python -m http.server 5847 -d ${pkg}/share/solar-sync
          ''}";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [ pkgs.nodejs ];
        };
      });
}
