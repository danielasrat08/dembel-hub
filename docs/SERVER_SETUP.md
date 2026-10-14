# Test server setup — Oracle Cloud Always Free (ARM)

About 30–45 minutes the first time. Steps 1–3 need your own Oracle account; nobody else should create it,
because it is tied to your identity and payment card.

> Oracle reportedly reduced the Always Free Ampere allowance to **2 OCPU / 12 GB RAM** from 18 Aug 2026.
> That is still plenty for the Hub (~60 users). Check the current limits on Oracle's site when you sign up.

## 1. Create the Oracle Cloud account
1. Go to oracle.com/cloud/free and sign up. A card is required for identity verification; Always Free resources are not charged.
2. Choose a **home region** close to Ethiopia with Ampere capacity (e.g. *Germany Central (Frankfurt)* or *UAE East (Dubai)*). It cannot be changed later.

## 2. Create the virtual machine
Compute → Instances → **Create instance**
- Name: `dembel-hub-test`
- Image: **Canonical Ubuntu 24.04** (aarch64)
- Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPU, 12 GB memory (stays within Always Free)
- Networking: create a new VCN with a **public subnet**, assign a public IPv4
- SSH keys: **Generate a key pair** and download both files (keep the private key safe)
- Boot volume: 50 GB is enough

If you see "Out of capacity", try again later or pick another availability domain.

## 3. Open ports 80 and 443 in Oracle's network
Instance → Subnet → Security List → **Add Ingress Rules**:
- Source CIDR `0.0.0.0/0`, TCP, destination port `80`
- Source CIDR `0.0.0.0/0`, TCP, destination port `443`

## 4. Connect and prepare the server
```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<PUBLIC_IP>
# on the server:
curl -fsSLO https://raw.githubusercontent.com/<github-owner>/dembel-hub/main/infra/scripts/server-bootstrap.sh
bash server-bootstrap.sh
exit   # log out and back in so Docker works without sudo
```
(If the repository is private, copy the script with `scp` instead of `curl`.)

## 5. Get the code and configure it
```bash
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<PUBLIC_IP>
cd /opt && git clone https://github.com/<github-owner>/dembel-hub.git dembel-hub && cd dembel-hub
cp .env.example .env
nano .env
```
In `.env`:
- `APP_DOMAIN` — for testing without buying a domain use **`<IP-with-dashes>.sslip.io`**, e.g. `141-147-10-20.sslip.io`.
  It resolves to your server and Caddy gets a real HTTPS certificate for it automatically.
- `WEB_ORIGIN` — `https://` + the same domain.
- Replace every `change-me…` value. Generate strong values with `openssl rand -base64 32`.
- `DATABASE_URL` must use the same user and password as `POSTGRES_USER` / `POSTGRES_PASSWORD`.

## 6. Start it
Copy the real staff roster to the server first (it is not in the repository; I send it to you separately):
```bash
# from your computer:
scp -i ~/Downloads/ssh-key-*.key staff.private.json ubuntu@<PUBLIC_IP>:/opt/dembel-hub/
```
Then on the server:
```bash
bash infra/scripts/deploy.sh
docker compose cp staff.private.json api:/data/files/staff.private.json
docker compose run --rm -e SEED_ADMIN_PASSWORD='choose-a-temporary-password' api node dist/db/seed.js
rm staff.private.json
```
Open `https://<APP_DOMAIN>` on a phone. The status card should show Server and Database online, 5 teams, 45 active staff.

## 7. Nightly backups
```bash
crontab -e
# add:
15 2 * * * /opt/dembel-hub/infra/scripts/backup.sh >> /opt/dembel-hub-backups/backup.log 2>&1
```

## Everyday commands
| Task | Command |
|---|---|
| Deploy latest code | `bash infra/scripts/deploy.sh` |
| See logs | `docker compose logs -f api` |
| Restart | `docker compose restart` |
| Database shell | `docker compose exec db psql -U dembel dembel_hub` |
| Restore a backup | `bash infra/scripts/restore.sh /opt/dembel-hub-backups/<file>.sql.gz` |
