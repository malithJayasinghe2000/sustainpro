---
description: How to deploy changes to production server
---

ssh deploy@your-server-ip
cd ~/apps/sustainpro
git pull origin sandaru-fix
bash scripts/deploy-production.sh