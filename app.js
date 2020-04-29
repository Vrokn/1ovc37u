const express = require("express");
const mongoose = require("mongoose");
const Note = require("./models/Note");
const path = require('path');
const md = require('marked');
const app = express();

const pageViewSchema = new mongoose.Schema({
  date: { type: Date , default: Date.now },
  path: String, 
  userAgent: String, 
});
const pageView = mongoose.model("pageView", pageViewSchema);

mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/notes', { useNewUrlParser: true, useUnifiedTopology: true });

app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/analytics ', (req, res) => {
  PageView.find({}, (error, data) => {    
  let tr = '';
  data.forEach((article) => {
    tr += ('<tr><td>'+article['path']+'</td>'+
           '<td>'+article.visits+'</td></tr>' );
  });
  let header = ('<table><thead><tr>'+
                '<th class="text-center">'+"Path"+'</th>'+
                '<th class="text-center">'+"Visits"+'</th>'+
                '</tr></thead>'+tr+'</table>');
  return  res.send(header);
  });
});
  
const contador = async (req, res, next) => {
  const userAgent = req.headers['user-agent'];
  const path = req._parsedUrl.pathname;
  const pageview = new pageView({ path, userAgent });
  try {
    await pageview.save();
  } catch (e) {
    console.log('error');  
  }
  const data = await pageView.aggregate([
    {
      "$group": {    
        "_id": "$path",
        "count": { "$sum": 1 }, 
      }
    },
    {
      "$sort": {
        "count": -1, // 1 asc ; - 1 desc
      }
    }
  ]).exec(); 
console.log('data', data);
  req.allPaths = data;
  next(); // esto es necesario para que la petición continúe
}


app.get("/", contador, async (req, res) => {
  const notes = await Note.find();
  res.render("index",{ notes: notes } )
});

app.get("/analytics", contador, (req, res) => {
  console.log("/analytics", req.allPaths);
  res.render("table", { entries: req.allPaths })
});

app.get("/notes/new", contador, async (req, res) => {
  const notes = await Note.find();
  res.render("new", { notes: notes });
});

app.post("/notes", async (req, res, next) => {
  const data = {
    title: req.body.title,
    body: req.body.body
  };

  const note = new Note(req.body);
  try {
    await note.save();
  } catch (e) {
    return next(e);
  }

  res.redirect('/');
});

app.get("/notes/:id", contador, async (req, res) => {
  const notes = await Note.find();
  const note = await Note.findById(req.params.id);
  res.render("show", { notes: notes, currentNote: note, md: md });
});

app.get("/notes/:id/edit", contador, async (req, res, next) => {
  const notes = await Note.find();
  const note = await Note.findById(req.params.id);
  res.render("edit", { notes: notes, currentNote: note });
});

app.patch("/notes/:id", async (req, res) => {
  const id = req.params.id;
  const note = await Note.findById(id);
  
  note.title = req.body.title;
  note.body = req.body.body;

  try {
    await note.save();
  } catch (e) {
    return next(e);
  }

  res.status(204).send({});
});

app.delete("/notes/:id", async (req, res) => {
  await Note.deleteOne({ _id: req.params.id });
  res.status(204).send({});
});

app.listen(3000, () => console.log("Listening on port 3000 ..."));
