import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1743441000000 implements MigrationInterface {
  name = 'InitialSchema1743441000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "refreshToken" text, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_type_enum" AS ENUM('затравка', 'фамильяр', 'легенда', 'сокровище', 'волшебник', 'тварь', 'заклинание', 'место', 'ChaosCard', 'StrayMagic', 'SluggishStick')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "cost" integer NOT NULL, "effect" character varying NOT NULL, "properties" text NOT NULL, "attackProperties" text NOT NULL, "defenseProperties" text NOT NULL, "damage" integer, "power" integer, "imageUrl" character varying NOT NULL, "isAttack" boolean NOT NULL, "isDefense" boolean NOT NULL, "isSingleCard" boolean NOT NULL DEFAULT true, "isPermanent" boolean NOT NULL DEFAULT false, "victoryPoints" integer NOT NULL, "groupAttack" text, "type" "public"."card_type_enum" NOT NULL DEFAULT 'затравка', "gameId" integer, CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "move" ("id" SERIAL NOT NULL, "moveData" json NOT NULL, "timestamp" TIMESTAMP NOT NULL, "gameId" integer, "playerId" integer, CONSTRAINT "PK_0befa9c6b3a216e49c494b4acc5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "game" ("id" SERIAL NOT NULL, "gameState" json, "currentTurn" integer NOT NULL, "currentTurnIndex" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'pending', "winnerId" integer, CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lobby_player" ("id" SERIAL NOT NULL, "ready" boolean NOT NULL DEFAULT false, "userId" integer, "invitationId" integer, CONSTRAINT "PK_c6f86038739fb533239d14c8140" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitation" ("id" SERIAL NOT NULL, "status" character varying NOT NULL, "token" character varying, "gameId" integer, "senderId" integer, CONSTRAINT "PK_beb994737756c0f18a1c1f8669c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "game_players_user" ("gameId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_f6c9473651427afacd9e37182e0" PRIMARY KEY ("gameId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8d910648c34fa95ddac401582" ON "game_players_user" ("gameId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd8735bd5c8888cc8719136d0c" ON "game_players_user" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "invitation_receivers_user" ("invitationId" integer NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_cb6131c240e8987ed58229556a3" PRIMARY KEY ("invitationId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b65c4b140dffefd1d46c0be5cd" ON "invitation_receivers_user" ("invitationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b742aacd7717e945c6458108f" ON "invitation_receivers_user" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "card" ADD CONSTRAINT "FK_e20b38d14ce0b0706c3bb482933" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "move" ADD CONSTRAINT "FK_e7d286bcab2828876ab2eef3515" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "move" ADD CONSTRAINT "FK_98696f76384a927d49404462aac" FOREIGN KEY ("playerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "FK_cd57acb58d1147c23da5cd09cae" FOREIGN KEY ("winnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobby_player" ADD CONSTRAINT "FK_0a873758ae5f81be4843e65f54f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobby_player" ADD CONSTRAINT "FK_c5270a8ca3997119235f9f0ca46" FOREIGN KEY ("invitationId") REFERENCES "invitation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD CONSTRAINT "FK_4becefb4eb12f57d8a578d83946" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players_user" ADD CONSTRAINT "FK_c8d910648c34fa95ddac401582f" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players_user" ADD CONSTRAINT "FK_fd8735bd5c8888cc8719136d0c4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_receivers_user" ADD CONSTRAINT "FK_b65c4b140dffefd1d46c0be5cd4" FOREIGN KEY ("invitationId") REFERENCES "invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_receivers_user" ADD CONSTRAINT "FK_1b742aacd7717e945c6458108f5" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitation_receivers_user" DROP CONSTRAINT "FK_1b742aacd7717e945c6458108f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation_receivers_user" DROP CONSTRAINT "FK_b65c4b140dffefd1d46c0be5cd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players_user" DROP CONSTRAINT "FK_fd8735bd5c8888cc8719136d0c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_players_user" DROP CONSTRAINT "FK_c8d910648c34fa95ddac401582f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP CONSTRAINT "FK_4becefb4eb12f57d8a578d83946"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobby_player" DROP CONSTRAINT "FK_c5270a8ca3997119235f9f0ca46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lobby_player" DROP CONSTRAINT "FK_0a873758ae5f81be4843e65f54f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" DROP CONSTRAINT "FK_cd57acb58d1147c23da5cd09cae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "move" DROP CONSTRAINT "FK_98696f76384a927d49404462aac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "move" DROP CONSTRAINT "FK_e7d286bcab2828876ab2eef3515"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card" DROP CONSTRAINT "FK_e20b38d14ce0b0706c3bb482933"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b742aacd7717e945c6458108f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b65c4b140dffefd1d46c0be5cd"`,
    );
    await queryRunner.query(`DROP TABLE "invitation_receivers_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fd8735bd5c8888cc8719136d0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8d910648c34fa95ddac401582"`,
    );
    await queryRunner.query(`DROP TABLE "game_players_user"`);
    await queryRunner.query(`DROP TABLE "invitation"`);
    await queryRunner.query(`DROP TABLE "lobby_player"`);
    await queryRunner.query(`DROP TABLE "game"`);
    await queryRunner.query(`DROP TABLE "move"`);
    await queryRunner.query(`DROP TABLE "card"`);
    await queryRunner.query(`DROP TYPE "public"."card_type_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
