```markdown
PartyPic is a Simple WebApp that is capable of make people interacting with each other and collects funny picture at the same time.
It allocate (sometimes obscure) photo objectives random to guests and gives every guest the oppertunity to upload their photos. 
After the Event the Host can download the Pictures.

pgAdmin (Postgres web UI)
-------------------------

To run pgAdmin alongside the project's Postgres instance use the provided Docker Compose setup. pgAdmin will be available on http://localhost:8080 with the default credentials:

- Email: admin@local
- Password: admin

After logging in, create a new server in pgAdmin with these connection details (when pgAdmin runs in Docker Compose with the Postgres service in the same compose file):

- Host: db
- Port: 5432
- Username: partyuser
- Password: partypass
- Maintenance DB: partydb

Start the service with:

```bash
docker compose up -d pgadmin
```

Or start all services:

```bash
docker compose up -d
```

```
PartyPic is a Simple WebApp that is capable of make people interacting with each other and collects funny picture at the same time.
It allocate (sometimes obscure) photo objectives random to guests and gives every guest the oppertunity to upload their photos. 
After the Event the Host can download the Pictures.
