job "stress-test" {
  datacenters = ["dc1"]

  group "web" {
    count = 3

    network {
      mode = "bridge"
      port "http" {
        static = 8080
      }
    }

    task "http-server" {
      driver = "docker"

      config {
        image = "my-docker-image:latest"
        args  = ["-text", "Hello, Nomad!"]
      }

      resources {
        cpu    = 1000
        memory = 1024
      }
    }
  }
}
