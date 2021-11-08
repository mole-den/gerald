CREATE TABLE guilds (
    id INT GENERATED ALWAYS AS IDENTITY,
    guildid BIGINT UNIQUE NOT NULL
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
    msgtime INT NOT NULL,
    channel BIGINT NOT NULL,
    deleted_time INT NOT NULL,
    FOREIGN KEY (author, guildid) REFERENCES members(userid, guild)
);

CREATE TABLE punishments (
    id INT GENERATED ALWAYS AS IDENTITY,
    member BIGINT REFERENCES members(userid),
    type VARCHAR(5) NOT NULL,
    reason VARCHAR(255) DEFAULT 'not given',
    created_time TIMESTAMP NOT NULL,
    duration INT DEFAULT 0
);

CREATE OR REPLACE FUNCTION replace_oldest() RETURNS TRIGGER AS $$
BEGIN
	IF count(SELECT * FROM deletedmsg WHERE guildid = NEW.guildid) > 100 THEN
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