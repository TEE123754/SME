-- Workers read quote snapshots for private quote documents; no quote write authority.
GRANT SELECT ON app.quotes TO cb_worker;
