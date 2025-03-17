listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

storage "file" {
  path = "/vault/data"
}

seal "transit" {
  address = "https://vault.internal:8200"
  token   = "vault-root-token"
}