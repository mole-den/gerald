CREATE TABLE guilds (
    id INT GENERATED ALWAYS AS IDENTITY,
    guildid BIGINT UNIQUE NOT NULL,
    joined_at TIMESTAMP NOT NULL
);

CREATE TABLE members (
    id INT GENERATED ALWAYS AS IDENTITY,
    guild BIGINT REFERENCES guilds(guildid),
    blacklisted BOOL DEFAULT FALSE,
    userid BIGINT NOT NULL,
    sexuality VARCHAR(30) DEFAULT 'straight',
    username VARCHAR(37),
    UNIQUE(guild, userid)
);

CREATE TABLE deletedmsgs (
    id INT GENERATED ALWAYS AS IDENTITY,
    author BIGINT,
    content TEXT,
    guildid BIGINT,
    msgtime TIMESTAMP NOT NULL,
    channel BIGINT NOT NULL,
    deleted_time TIMESTAMP NOT NULL,
    deleted_by VARCHAR(37) NOT NULL,
    msgid BIGINT UNIQUE
    FOREIGN KEY (author, guildid) REFERENCES members(userid, guild)
);

CREATE TABLE punishments (
    id INT GENERATED ALWAYS AS IDENTITY,
    member BIGINT,
    guild BIGINT,
    type VARCHAR(5) NOT NULL,
    reason VARCHAR(255) DEFAULT 'not given',
    created_time TIMESTAMP NOT NULL,
    duration INT DEFAULT 0,
    FOREIGN KEY (member, guild) REFERENCES members(userid, guild)
);

CREATE OR REPLACE FUNCTION replace_oldest() RETURNS TRIGGER AS $$
BEGIN
	IF (SELECT count(*) FROM deletedmsg WHERE guildid = NEW.guildid) > 100 THEN
	    DELETE FROM deletedmsg
	    WHERE id IN (SELECT id FROM deletedmsg ORDER BY timestamp LIMIT 1);
	END IF;
END;
$$ 
LANGUAGE plpgsql;

CREATE TRIGGER cycle_oldest
    AFTER UPDATE ON deletedmsgs 
    FOR EACH ROW 
    EXECUTE PROCEDURE replace_oldest();