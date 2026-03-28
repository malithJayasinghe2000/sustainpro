import os

file_path = "/opt/sustainpro/docker/docker-compose.production.yml"
with open(file_path, "r") as f:
    config = f.read()

config = config.replace("rule=Host(`${DOMAIN}`)", "rule=PathPrefix(`/`)")
config = config.replace("rule=Host(`api.${DOMAIN}`)", "rule=PathPrefix(`/api`)")

with open(file_path, "w") as f:
    f.write(config)

print("Rules updated successfully.")
