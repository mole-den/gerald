DROP TABLE guild IF EXISTS;
DROP TABLE gmember IF EXISTS;
DROP TABLE deletedmsg IF EXISTS;

CREATE TABLE guild (
    id INT GENERATED ALWAYS AS IDENTITY,
    guildid BIGINT UNIQUE NOT NULL
);

CREATE TABLE gmember (
    id INT GENERATED ALWAYS AS IDENTITY,
    guild BIGINT REFERENCES guild(guildid),
    blacklisted BOOL DEFAULT FALSE,
    userid BIGINT NOT NULL,
    sexuality VARCHAR(30) DEFAULT 'straight',
    username VARCHAR(37) NOT NULL,
    UNIQUE(guild, userid)
);

CREATE TABLE deletedmsg (
    id INT GENERATED ALWAYS AS IDENTITY,
    author BIGINT,
    content TEXT,
    guildid BIGINT,
    timestamp INT NOT NULL,
    channel BIGINT NOT NULL,
    deleted_time INT NOT NULL,
    FOREIGN KEY (author, guildid) REFERENCES gmember(userid, guild)
);

CREATE OR REPLACE FUNCTION delete_msg() RETURNS TRIGGER AS $$
BEGIN
	IF (SELECT count(*) FROM deletedmsg WHERE guildid = NEW.guildid) > 100 THEN
	DELETE FROM deletedmsg
	WHERE id IN (
   		SELECT id FROM
   		deletedmsg ORDER BY timestamp LIMIT 1);
	END IF;
END;
$$ 
LANGUAGE plpgsql;

CREATE TRIGGER cycle_oldest
    AFTER UPDATE ON deletedmsg 
    FOR EACH ROW 
    EXECUTE PROCEDURE replace_oldest();