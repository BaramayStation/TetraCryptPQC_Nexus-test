datacenter = "dc1"

server {
  enabled = true
  bootstrap_expect = 1
}

client {
  enabled = true
}

ports {
  http = 4649
}
