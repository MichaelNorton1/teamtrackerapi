const express = require("express");
const request = require("request");
const app = express();

const cors = require("cors");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { key, password } = require("./config.js");
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const knex = require("knex")({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
  pool: { min: 0, max: 50 },
});

app.listen(process.env.PORT, () => {
  console.log(`app is running on Port ${process.env.PORT}`);
});
app.get("/", (req, res) => {
  knex
    .raw("DELETE from teams a using teams b where a=b and a.ctid < b.ctid;")

    .catch((err) => console.log(err));
  res.send("");
});
app.post("/favorites", (req, res) => {
  const teams = req.body;

  teams.forEach((element) => {
    knex
      .transaction((trx) => {
        trx
          .insert({
            idteam: element.idTeam,
            strteam: element.strTeam,
            strteambadge: element.strTeamBadge,
            id: element.id,
          })
          .into("teams")
          .returning("*")
          .transacting(trx)
          .then((team) => {
            return knex("teams");
          })
          .then(trx.commit)
          .catch(trx.rollback);
      })
      .then(console.log("transaction complete"))
      .catch((err) => console.log(err));
  });

  res.send();
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.name || !req.body.password) {
    return res.status(400).json("incorrect submission form");
  }
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    knex
      .transaction((trx) => {
        trx
          .insert({ hash: hash, email: req.body.email, name: req.body.name })
          .into("users")
          .then(trx.commit)
          .catch(trx.rollback);
      })
      .then((data) => {
        knex("users")
          .select("userid")
          .where("email", req.body.email)
          .then((data) => {
            return res.status(200).json(data[0]);
          });
      })
      .catch((err) => console.log(err))
      .catch((err) => res.status(400))

      .catch((err) => console.log("second", err));

    // Store hash in your password DB.
  });
});
app.post("/signin", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json("please enter valid submission");
  }
  knex("users")
    .select("email", "hash", "userid")
    .where("email", "=", email)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      const id = { userid: data[0].userid };

      if (isValid) {
        return res.status(200).json(id);
      } else {
        return res.status(400).json(" wrong credents");
      }
    })
    .catch((err) => console.log(err));

  knex
    .raw("DELETE from teams a using teams b where a=b and a.ctid < b.ctid;")

    .catch((err) => console.log(err));
});

app.delete("/favorites", (req, res) => {
  console.log(req.body);
  // add id to delete select teams
  knex
    .transaction((trx) => {
      trx
        .select("*")
        .from("teams")
        .where({ strteam: req.body.team, id: req.body.id })
        .del()
        .then(trx.commit)
        .catch(trx.rollback);
    })
    .catch((err) => console.log(err));
  res.status(200).send({ message: `${req.body.team} deleted` });
});

app.post("/favorites/id", (req, res) => {
  //recieve id from sign in to get favorites by id
  console.log("post", req.body);
  if (req.body.id) {
    knex
      .distinct()
      .select("*")
      .from("teams")

      .where({ id: req.body.id })
      .then((teams) => {
        res.json(teams);
        //res.json(teams);
      })
      .catch((err) => console.log(err));
  }
});

app.post("/favorites/next", cors(), (req, res) => {
  const id = req.body.id.toString();

  request(
    {
      url: `https://www.thesportsdb.com/api/v1/json/4013016/eventsnext.php?id=${id}`,
      json: true,
    },
    (error, response) => {
      const pic = {
        pic: response.body.events[0].strThumb,
        event: response.body.events[0].strEvent,
        date: response.body.events[0].dateEvent,
      };

      res.send(pic);
    }
  );
});
