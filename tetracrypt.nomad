job "tetracrypt" {
  datacenters = ["dc1"]
  type = "service"

  group "tetracrypt" {
    count = 3

    network {
      mode = "bridge"
      port "yggdrasil" {
        to = 8080
      }
    }

    task "tetracrypt" {
      driver = "podman"

      config {
        image = "tetracrypt:latest"
        ports = ["yggdrasil"]
        read_only = true
        user = "nobody"
        security_opts = [
          "seccomp=/etc/podman/seccomp.json",
          "apparmor=/etc/podman/apparmor.profile"
        ]
        capabilities = ["NET_BIND_SERVICE"]
      }

      env {
        YGGDRASIL_NETWORK = "private"
        FIPS_MODE = "enabled"
        ZERO_TRUST = "true"
      }

      template {
        data = <<EOF
        # Key rotation config
        KEY_ROTATION_INTERVAL = "24h"
        ML_KEM_KEY_SIZE = "1024"
        SLH_DSA_KEY_SIZE = "256"
        EOF
        destination = "local/env.conf"
      }
    }
  }
}
