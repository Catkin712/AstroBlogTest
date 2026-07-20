# VPS Deployment

This project uses Astro for static assets and Cloudflare Pages-style functions for the home page, posts, tags, categories, RSS, search, and admin APIs.

For a VPS, run the included Node server instead of serving `dist` directly with Nginx.

## 1. Prepare The Server

Install Node.js 22, Git, Nginx, and PM2:

```bash
sudo apt update
sudo apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
```

## 2. Upload Or Clone The Project

Put the whole project on the server, not only `dist`.

Example:

```bash
sudo mkdir -p /var/www/catkinsblog
sudo chown -R $USER:$USER /var/www/catkinsblog
```

Then upload the project files to `/var/www/catkinsblog`.

## 3. Configure Environment Variables

Create `/var/www/catkinsblog/.env`:

```bash
nano /var/www/catkinsblog/.env
```

Add:

```env
HOST=127.0.0.1
PORT=3000
ADMIN_USERNAME=catkin
ADMIN_PASSWORD=change-this-password
ADMIN_SESSION_SECRET=change-this-long-random-secret
GITHUB_TOKEN=your-github-token
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
```

`GITHUB_TOKEN` needs repository contents read and write access if you want the admin page to save posts or covers.

## 4. Install And Build

```bash
cd /var/www/catkinsblog
npm install
npm run build
```

## 5. Start The Node Server

```bash
pm2 start npm --name catkinsblog -- start
pm2 save
pm2 startup
```

After running `pm2 startup`, copy and run the command printed by PM2.

Check the local service:

```bash
curl http://127.0.0.1:3000
```

## 6. Configure Nginx

Create `/etc/nginx/sites-available/catkinsblog`:

```nginx
server {
    listen 80;
    server_name 123.99.201.167;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -sf /etc/nginx/sites-available/catkinsblog /etc/nginx/sites-enabled/catkinsblog
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

Open:

```text
http://123.99.201.167
```

If the browser cannot connect, allow TCP port 80 in your cloud provider security group.

## Updating The Site

After changing code:

```bash
cd /var/www/catkinsblog
npm install
npm run build
pm2 restart catkinsblog
```
