CREATE FUNCTION replace_oldest() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
IF (SELECT count(*) FROM deletedmsgs WHERE guildid = NEW.guildid) > 100 THEN
	    DELETE FROM deletedmsgs
	    WHERE id IN (SELECT id FROM deletedmsgs WHERE guildid = NEW.guildid ORDER BY timestamp LIMIT 1);
END IF;
END;
$$;

CREATE TABLE guilds (
    id integer GENERATED ALWAYS AS IDENTITY,
    guildid bigint NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    prefix text DEFAULT 'g'::character varying,
    disabled character varying(255)[] DEFAULT '{}'::character varying[],
    delmsg_public_key text,
    UNIQUE (guildid)
);


CREATE TABLE members (
    id integer GENERATED ALWAYS AS IDENTITY,
    guild bigint,
    userid bigint NOT NULL,
    UNIQUE (guild, userid),
    FOREIGN KEY (guild) REFERENCES guilds(guildid)
);

CREATE TABLE deletedmsgs (
    id integer GENERATED ALWAYS AS IDENTITY,
    author bigint,
    content text,
    guildid bigint,
    msgtime timestamp without time zone NOT NULL,
    channel bigint NOT NULL,
    deleted_time timestamp without time zone NOT NULL,
    deleted_by character varying(37) NOT NULL,
    msgid bigint,
    attachments jsonb,
	UNIQUE (msgid),
    FOREIGN KEY (author, guildid) REFERENCES members(userid, guild)
);

CREATE TABLE punishments (
    id integer GENERATED ALWAYS AS IDENTITY,
    member bigint,
    guild bigint,
    type character varying(5) NOT NULL,
    reason character varying(255) DEFAULT 'not given'::character varying,
    created_time timestamp without time zone NOT NULL,
    resolved boolean DEFAULT false,
    ends_at timestamp without time zone,
    ends timestamp without time zone,
    FOREIGN KEY (member, guild) REFERENCES members(userid, guild)
);
