import { useState, useEffect, useRef } from "react";

const PARCHMENT = "#F5EFE0";
const INK = "#1C1410";
const GOLD = "#C9A84C";
const RUST = "#8B3A2A";
const SAGE = "#4A6741";
const CREAM = "#FAF6ED";

const STORAGE_KEY = "bible_study_progress";
const PLAN_KEY = "bible_reading_plan";
const CONVOS_KEY = "bible_study_convos";

const loadData = async () => {
  const result = { study_log: [], completed_chapters: {}, saved_convos: {} };
  try { const s = await window.storage.get(STORAGE_KEY); if(s) result.study_log = JSON.parse(s.value); } catch(e){}
  try { const p = await window.storage.get(PLAN_KEY); if(p) result.completed_chapters = JSON.parse(p.value); } catch(e){}
  try { const c = await window.storage.get(CONVOS_KEY); if(c) result.saved_convos = JSON.parse(c.value); } catch(e){}
  return result;
};

const systemPrompt = `You are a warm, knowledgeable non-denominational Bible study companion. 
You help users understand scripture deeply — providing historical context, original language insights, theological meaning, and practical life application.
Always be encouraging, clear, and grounded in the text itself.
When explaining passages: cover (1) context, (2) key themes, (3) cross-references, (4) practical application.
When giving quizzes: ask 3-5 thoughtful questions mixing comprehension and reflection.
Keep responses warm and conversational, not overly academic.`;

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');`;

const READING_PLAN = [
  { phase:1, title:"The Foundation — Who Is Jesus?", description:"Start with the Gospels and core NT letters to anchor your faith", color:SAGE,
    books:[{book:"John",chapters:21},{book:"Mark",chapters:16},{book:"Romans",chapters:16},{book:"Ephesians",chapters:6},{book:"Philippians",chapters:4},{book:"Colossians",chapters:4}]},
  { phase:2, title:"Wisdom & Worship", description:"Psalms, Proverbs, and books of wisdom for daily life", color:GOLD,
    books:[{book:"Psalms",chapters:150},{book:"Proverbs",chapters:31},{book:"Ecclesiastes",chapters:12},{book:"Song of Solomon",chapters:8},{book:"Job",chapters:42}]},
  { phase:3, title:"In the Beginning — The Story of Israel", description:"The OT narrative from creation through the wilderness", color:RUST,
    books:[{book:"Genesis",chapters:50},{book:"Exodus",chapters:40},{book:"Numbers",chapters:36},{book:"Deuteronomy",chapters:34},{book:"Joshua",chapters:24},{book:"Judges",chapters:21},{book:"Ruth",chapters:4},{book:"Leviticus",chapters:27}]},
  { phase:4, title:"The Church is Born — Acts & Letters", description:"How the early church spread and Paul's letters to the churches", color:"#4A7A8A",
    books:[{book:"Luke",chapters:24},{book:"Acts",chapters:28},{book:"1 Corinthians",chapters:16},{book:"2 Corinthians",chapters:13},{book:"Galatians",chapters:6},{book:"1 Thessalonians",chapters:5},{book:"2 Thessalonians",chapters:3},{book:"1 Timothy",chapters:6},{book:"2 Timothy",chapters:4},{book:"Titus",chapters:3},{book:"Philemon",chapters:1},{book:"Hebrews",chapters:13},{book:"James",chapters:5},{book:"1 Peter",chapters:5},{book:"2 Peter",chapters:3},{book:"1 John",chapters:5},{book:"2 John",chapters:1},{book:"3 John",chapters:1},{book:"Jude",chapters:1}]},
  { phase:5, title:"Kings, Prophets & the Heart of Israel", description:"Israel's kings, the major prophets, and God's covenant faithfulness", color:"#7A5C8A",
    books:[{book:"1 Samuel",chapters:31},{book:"2 Samuel",chapters:24},{book:"1 Kings",chapters:22},{book:"2 Kings",chapters:25},{book:"1 Chronicles",chapters:29},{book:"2 Chronicles",chapters:36},{book:"Ezra",chapters:10},{book:"Nehemiah",chapters:13},{book:"Esther",chapters:10},{book:"Isaiah",chapters:66},{book:"Jeremiah",chapters:52},{book:"Lamentations",chapters:5},{book:"Ezekiel",chapters:48},{book:"Daniel",chapters:12}]},
  { phase:6, title:"The Minor Prophets & Revelation", description:"Completing the prophets and the final vision of God's plan", color:"#8A6A3A",
    books:[{book:"Hosea",chapters:14},{book:"Joel",chapters:3},{book:"Amos",chapters:9},{book:"Obadiah",chapters:1},{book:"Jonah",chapters:4},{book:"Micah",chapters:7},{book:"Nahum",chapters:3},{book:"Habakkuk",chapters:3},{book:"Zephaniah",chapters:3},{book:"Haggai",chapters:2},{book:"Zechariah",chapters:14},{book:"Malachi",chapters:4},{book:"Matthew",chapters:28},{book:"Revelation",chapters:22}]}
];

const totalChapters = READING_PLAN.reduce((s,p)=>s+p.books.reduce((s2,b)=>s2+b.chapters,0),0);

export default function BibleStudy() {
  const [tab, setTab] = useState("study");
  const [passage, setPassage] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [studyLog, setStudyLog] = useState([]);
  const [currentPassage, setCurrentPassage] = useState("");
  const [completedChapters, setCompletedChapters] = useState({});
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedBook, setExpandedBook] = useState(null);
  const [savedConvos, setSavedConvos] = useState({});
  const [storageReady, setStorageReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [hoveredChapter, setHoveredChapter] = useState(null); // {book, ch}
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadData().then(data => {
      setStudyLog(data.study_log || []);
      setCompletedChapters(data.completed_chapters || {});
      setSavedConvos(data.saved_convos || {});
      setStorageReady(true);
    }).catch(() => setStorageReady(true));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const persist = async (overrides = {}) => {
    setSyncStatus("saving");
    try {
      const sl = overrides.study_log ?? studyLog;
      const cc = overrides.completed_chapters ?? completedChapters;
      const sc = overrides.saved_convos ?? savedConvos;
      await window.storage.set(STORAGE_KEY, JSON.stringify(sl));
      await window.storage.set(PLAN_KEY, JSON.stringify(cc));
      await window.storage.set(CONVOS_KEY, JSON.stringify(sc));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus(""), 2000);
    } catch(e) {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus(""), 3000);
    }
  };

  const saveToLog = async (ref) => {
    const entry = {passage:ref, date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), timestamp:Date.now()};
    const updated = [entry,...studyLog.filter(e=>e.passage!==ref)].slice(0,50);
    setStudyLog(updated);
    await persist({ study_log: updated });
  };

  const toggleChapter = async (book, ch) => {
    const key = `${book}:${ch}`;
    const updated = {...completedChapters};
    if(updated[key]) delete updated[key]; else updated[key] = true;
    setCompletedChapters(updated);
    await persist({ completed_chapters: updated });
  };

  const saveConvo = async (passageRef, msgs) => {
    const updated = {...savedConvos, [passageRef]:{messages:msgs, updatedAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}};
    setSavedConvos(updated);
    await persist({ saved_convos: updated });
  };

  const clearConvo = async (passageRef) => {
    const updated = {...savedConvos};
    delete updated[passageRef];
    setSavedConvos(updated);
    setMessages([]);
    await persist({ saved_convos: updated });
  };

  const isChDone = (book, ch) => !!completedChapters[`${book}:${ch}`];
  const bookDone = (book, chapters) => Array.from({length:chapters},(_,i)=>i+1).filter(ch=>isChDone(book,ch)).length;
  const phaseDone = (phase) => {
    const total = phase.books.reduce((s,b)=>s+b.chapters,0);
    const done = phase.books.reduce((s,b)=>s+bookDone(b.book,b.chapters),0);
    return {total,done};
  };
  const totalDone = Object.keys(completedChapters).length;
  const overallPct = Math.round((totalDone/totalChapters)*100);

  const callClaude = async (userMessage, passageRef) => {
    const ref = passageRef || currentPassage;
    const newMsgs = [...messages, {role:"user",content:userMessage}];
    setMessages(newMsgs); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:systemPrompt,messages:newMsgs})
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "No response.";
      const finalMsgs = [...newMsgs,{role:"assistant",content:reply}];
      setMessages(finalMsgs);
      if(ref) await saveConvo(ref, finalMsgs);
    } catch(e) {
      setMessages([...newMsgs,{role:"assistant",content:"Error. Please try again."}]);
    }
    setLoading(false);
  };

  const handleStudy = async () => {
    if(!passage.trim()) return;
    const ref = passage.trim();
    setCurrentPassage(ref);
    const existing = savedConvos[ref];
    if(existing) { setMessages(existing.messages); } else { setMessages([]); }
    await saveToLog(ref);
    setTab("chat");
    if(!existing) await callClaude(`Please explain this passage: "${ref}". Cover context, key themes, cross-references, and life application.`, ref);
    setPassage("");
  };

  const handleSend = async () => {
    if(!input.trim()||loading) return;
    const msg = input; setInput("");
    await callClaude(msg);
  };

  const quickPassages = ["John 1:1","Psalm 23","Romans 8:28","Proverbs 3:5-6","Jeremiah 29:11","Philippians 4:13"];

  if(!storageReady) return (
    <div style={{minHeight:"100vh",background:INK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'EB Garamond',Georgia,serif",gap:16}}>
      <div style={{color:GOLD,fontSize:28}}>✝</div>
      <div style={{color:PARCHMENT,fontSize:16,letterSpacing:1}}>Loading your study data...</div>
    </div>
  );

  return (
    <>
      <style>{`
        ${fonts}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${INK}}
        .app{min-height:100vh;background:${CREAM};font-family:'EB Garamond',Georgia,serif;color:${INK};max-width:780px;margin:0 auto;display:flex;flex-direction:column;position:relative}
        .app::before{content:'';position:fixed;top:0;left:50%;transform:translateX(-50%);width:780px;height:100vh;background:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(201,168,76,0.08) 27px,rgba(201,168,76,0.08) 28px);pointer-events:none;z-index:0}
        header{position:relative;z-index:1;background:${INK};color:${PARCHMENT};padding:20px 28px 16px;border-bottom:3px solid ${GOLD}}
        .hrow{display:flex;align-items:flex-start;justify-content:space-between}
        .hcross{font-size:11px;letter-spacing:4px;color:${GOLD};text-transform:uppercase;margin-bottom:4px}
        header h1{font-family:'Playfair Display',serif;font-size:26px;font-weight:700}
        header p{font-size:13px;color:rgba(245,239,224,0.6);margin-top:3px;font-style:italic}
        .sync{font-size:11px;letter-spacing:1px;padding:4px 10px;border-radius:20px;transition:all 0.3s}
        .sync.saving{background:rgba(201,168,76,0.15);color:${GOLD}}
        .sync.saved{background:rgba(74,103,65,0.2);color:#7AB86A}
        .sync.error{background:rgba(139,58,42,0.2);color:#E07060}
        nav{position:relative;z-index:1;display:flex;background:${INK};border-bottom:1px solid rgba(201,168,76,0.3);overflow-x:auto}
        nav button{flex:1;min-width:70px;padding:11px 6px;background:none;border:none;color:rgba(245,239,224,0.5);font-family:'EB Garamond',serif;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border-bottom:2px solid transparent;white-space:nowrap}
        nav button.active{color:${GOLD};border-bottom-color:${GOLD}}
        nav button:hover:not(.active){color:${PARCHMENT}}
        .content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;padding:22px 26px;gap:18px}
        .stitle{font-family:'Playfair Display',serif;font-size:20px;font-weight:400;color:${RUST};border-bottom:1px solid ${GOLD};padding-bottom:8px}
        textarea{font-family:'EB Garamond',serif;font-size:16px;background:white;border:1.5px solid rgba(201,168,76,0.4);border-radius:2px;padding:12px 14px;color:${INK};outline:none;transition:border-color 0.2s;resize:none}
        textarea:focus{border-color:${GOLD}}
        .btn{font-family:'EB Garamond',serif;font-size:15px;letter-spacing:0.5px;padding:11px 18px;border:none;cursor:pointer;transition:all 0.2s;border-radius:2px;white-space:nowrap}
        .bp{background:${INK};color:${GOLD};border:1.5px solid ${INK}}.bp:hover{background:${RUST};border-color:${RUST}}
        .bo{background:transparent;color:${RUST};border:1.5px solid ${RUST}}.bo:hover{background:${RUST};color:white}
        .bg{background:${GOLD};color:${INK};font-weight:500}.bg:hover{background:#B8943C}
        .btn:disabled{opacity:0.4;cursor:not-allowed}
        .qv{display:flex;flex-wrap:wrap;gap:8px}
        .vc{font-family:'EB Garamond',serif;font-size:13px;padding:5px 12px;background:transparent;border:1px solid rgba(201,168,76,0.5);border-radius:20px;cursor:pointer;color:${SAGE};transition:all 0.2s}
        .vc:hover{background:${SAGE};color:white;border-color:${SAGE}}
        .msgs{flex:1;min-height:300px;max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;padding:16px;background:white;border:1.5px solid rgba(201,168,76,0.3);border-radius:2px}
        .msg{display:flex;flex-direction:column;gap:4px}
        .mlabel{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(28,20,16,0.4)}
        .msg.user .mlabel{color:${RUST}}.msg.assistant .mlabel{color:${SAGE}}
        .mbody{font-size:15px;line-height:1.75;white-space:pre-wrap}
        .msg.user .mbody{font-style:italic;color:${RUST}}
        .divider{border:none;border-top:1px solid rgba(201,168,76,0.2)}
        .dots{display:flex;gap:5px;padding:8px 0}
        .dot{width:6px;height:6px;background:${GOLD};border-radius:50%;animation:pulse 1.2s infinite ease-in-out}
        .dot:nth-child(2){animation-delay:0.2s}.dot:nth-child(3){animation-delay:0.4s}
        @keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        .empty{text-align:center;padding:40px 20px;color:rgba(28,20,16,0.35);font-style:italic;font-size:15px}
        .obar-wrap{background:rgba(28,20,16,0.1);border-radius:2px;height:8px;overflow:hidden;margin-top:6px}
        .obar{height:100%;background:${GOLD};border-radius:2px;transition:width 0.4s}
        .pcard{border:1.5px solid rgba(201,168,76,0.3);border-radius:2px;overflow:hidden;background:white;margin-bottom:2px}
        .phead{display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer;transition:background 0.15s}
        .phead:hover{background:rgba(201,168,76,0.06)}
        .pdot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .pinfo{flex:1}.pname{font-family:'Playfair Display',serif;font-size:15px}
        .pmeta{font-size:12px;color:rgba(28,20,16,0.45);font-style:italic;margin-top:2px}
        .ppct{font-size:13px;color:rgba(28,20,16,0.5);margin-right:8px}
        .pchev{font-size:12px;color:rgba(28,20,16,0.3);transition:transform 0.2s}.pchev.open{transform:rotate(180deg)}
        .pbar-wrap{height:3px;background:rgba(28,20,16,0.08)}.pbar{height:100%;transition:width 0.3s}
        .blist{border-top:1px solid rgba(201,168,76,0.2)}.brow{border-bottom:1px solid rgba(201,168,76,0.1)}
        .bhead{display:flex;align-items:center;gap:10px;padding:10px 16px 10px 28px;cursor:pointer;transition:background 0.15s}
        .bhead:hover{background:rgba(201,168,76,0.05)}
        .bname{flex:1;font-size:15px}.bprog{font-size:12px;color:rgba(28,20,16,0.4)}
        .bchev{font-size:11px;color:rgba(28,20,16,0.25);transition:transform 0.2s}.bchev.open{transform:rotate(180deg)}
        .chgrid{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px 14px 28px;background:rgba(245,239,224,0.4)}
        .chbtn{width:36px;height:32px;border-radius:2px;font-family:'EB Garamond',serif;font-size:13px;cursor:pointer;transition:all 0.15s;border:1px solid rgba(201,168,76,0.35);background:white;color:${INK};display:flex;align-items:center;justify-content:center}
        .chbtn.done{background:${SAGE};color:white;border-color:${SAGE}}
        .chbtn:hover:not(.done){border-color:${GOLD};background:rgba(201,168,76,0.1)}
        .srow{display:flex;gap:12px}
        .sbox{flex:1;background:${INK};color:${PARCHMENT};padding:14px;text-align:center;border-radius:2px}
        .snum{font-family:'Playfair Display',serif;font-size:28px;color:${GOLD};display:block}
        .slabel{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.6;margin-top:4px}
        .lentry{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:white;border:1px solid rgba(201,168,76,0.3);border-left:3px solid ${GOLD};border-radius:2px}
        .lpsg{font-family:'Playfair Display',serif;font-size:16px}
        .ldate{font-size:13px;color:rgba(28,20,16,0.4);font-style:italic}
        .lbtn{font-size:12px;padding:5px 12px;background:transparent;border:1px solid ${RUST};border-radius:2px;color:${RUST};cursor:pointer;font-family:'EB Garamond',serif;transition:all 0.2s}
        .lbtn:hover{background:${RUST};color:white}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.4);border-radius:3px}
      `}</style>

      <div className="app">
        <header>
          <div className="hrow">
            <div>
              <div className="hcross">✝ &nbsp; Scripture Study</div>
              <h1>The Word</h1>
              <p>Your personal Bible study companion</p>
            </div>
            {syncStatus && (
              <div className={`sync ${syncStatus}`}>
                {syncStatus==="saving" && "⟳ Saving..."}
                {syncStatus==="saved" && "✓ Saved"}
                {syncStatus==="error" && "✗ Error"}
              </div>
            )}
          </div>
        </header>

        <div style={{background:`linear-gradient(135deg,#2A1F0A 0%,#1C1410 100%)`,padding:"16px 28px",borderBottom:`1px solid rgba(201,168,76,0.25)`,position:"relative",zIndex:1}}>
          <div style={{fontSize:10,letterSpacing:3,color:GOLD,textTransform:"uppercase",marginBottom:6,opacity:0.8}}>✦ Favourite Verse ✦</div>
          <p style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:15,color:PARCHMENT,lineHeight:1.7,margin:0}}>
            "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul. He leads me in paths of righteousness for his name's sake. Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me. You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows. Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever."
          </p>
          <div style={{marginTop:6,fontSize:12,color:GOLD,letterSpacing:1}}>— Psalm 23 (ESV)</div>
        </div>

        <nav>
          {[["study","Study"],["chat","Discuss"],["plan","Plan"],["progress","Progress"]].map(([id,label])=>(
            <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </nav>

        {tab==="study" && (
          <div className="content">
            <div>
              <h2 className="stitle">Enter a Passage</h2>
              <p style={{marginTop:8,fontSize:15,color:"rgba(28,20,16,0.6)",fontStyle:"italic"}}>Type any verse or passage reference to study it</p>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <textarea style={{flex:1,minHeight:52,maxHeight:120}} placeholder="e.g. Romans 8:38-39 or John 3:16..."
                value={passage} onChange={e=>setPassage(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleStudy();}}}/>
              <button className="btn bp" onClick={handleStudy} disabled={!passage.trim()}>Study →</button>
            </div>
            <div>
              <p style={{fontSize:13,letterSpacing:1,textTransform:"uppercase",color:"rgba(28,20,16,0.4)",marginBottom:10}}>Quick Access</p>
              <div className="qv">{quickPassages.map(v=><button key={v} className="vc" onClick={()=>setPassage(v)}>{v}</button>)}</div>
            </div>
            <div style={{borderTop:`1px solid rgba(201,168,76,0.3)`,paddingTop:20}}>
              <h2 className="stitle" style={{marginBottom:12}}>What You'll Get</h2>
              {[["📖","Context & Background","Historical setting, author's intent, original audience"],["🔑","Key Themes","Core truths and theological significance"],["🔗","Cross-References","Related scriptures that deepen understanding"],["🌱","Life Application","How this speaks to your life today"]].map(([icon,title,desc])=>(
                <div key={title} style={{display:"flex",gap:12,marginBottom:14}}>
                  <span style={{fontSize:20}}>{icon}</span>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{title}</div>
                    <div style={{fontSize:13,color:"rgba(28,20,16,0.5)",fontStyle:"italic"}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="chat" && (
          <div className="content">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <h2 className="stitle" style={{borderBottom:"none",paddingBottom:0}}>{currentPassage?"Discussion":"Ask Anything"}</h2>
              {currentPassage && <span style={{fontSize:13,background:GOLD,color:INK,padding:"4px 12px",borderRadius:20,fontStyle:"italic"}}>{currentPassage}</span>}
              {currentPassage && <button className="btn bo" disabled={loading}
                onClick={()=>callClaude(`Quiz me on "${currentPassage}" with 3-5 questions — mix comprehension and personal reflection. Number each question.`)}>Quiz Me</button>}
              {currentPassage && savedConvos[currentPassage] && (
                <button className="btn" style={{background:"transparent",color:"rgba(28,20,16,0.35)",border:"1px solid rgba(28,20,16,0.15)",fontSize:12,padding:"6px 12px"}}
                  onClick={()=>clearConvo(currentPassage)}>Clear History</button>
              )}
            </div>
            <div className="msgs">
              {messages.length===0 && <div className="empty">{currentPassage?"Your study will appear here.":"Study a passage first, or ask any Bible question below."}</div>}
              {messages.map((m,i)=>(
                <div key={i}>
                  {i>0 && <hr className="divider" style={{marginBottom:16}}/>}
                  <div className={`msg ${m.role}`}>
                    <span className="mlabel">{m.role==="user"?"You":"✝ Study Companion"}</span>
                    <div className="mbody">{m.content}</div>
                  </div>
                </div>
              ))}
              {loading && <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>}
              <div ref={chatEndRef}/>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
              <textarea style={{flex:1,minHeight:52,maxHeight:120}} placeholder="Ask a follow-up question..." value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                disabled={loading}/>
              <button className="btn bg" onClick={handleSend} disabled={!input.trim()||loading}>Send</button>
            </div>
          </div>
        )}

        {tab==="plan" && (
          <div className="content">
            <div>
              <h2 className="stitle">Full Bible Reading Plan</h2>
              <p style={{marginTop:6,fontSize:14,color:"rgba(28,20,16,0.55)",fontStyle:"italic"}}>All 66 books · {totalChapters} chapters · thematic order</p>
            </div>
            <div style={{background:INK,padding:"16px 20px",borderRadius:2}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontFamily:"'Playfair Display',serif",color:PARCHMENT,fontSize:16}}>Overall Progress</span>
                <span style={{color:GOLD,fontSize:15}}>{totalDone} / {totalChapters} chapters</span>
              </div>
              <div className="obar-wrap"><div className="obar" style={{width:`${overallPct}%`}}/></div>
              <div style={{marginTop:6,fontSize:12,color:"rgba(245,239,224,0.4)",textAlign:"right"}}>{overallPct}% complete</div>
            </div>
            {READING_PLAN.map(phase=>{
              const {total,done}=phaseDone(phase);
              const pct=Math.round((done/total)*100);
              const isOpen=expandedPhase===phase.phase;
              return (
                <div key={phase.phase} className="pcard">
                  <div className="phead" onClick={()=>setExpandedPhase(isOpen?null:phase.phase)}>
                    <div className="pdot" style={{background:phase.color}}/>
                    <div className="pinfo">
                      <div className="pname">Phase {phase.phase}: {phase.title}</div>
                      <div className="pmeta">{phase.description}</div>
                    </div>
                    <span className="ppct">{done}/{total}</span>
                    <span className={`pchev ${isOpen?"open":""}`}>▼</span>
                  </div>
                  <div className="pbar-wrap"><div className="pbar" style={{width:`${pct}%`,background:phase.color}}/></div>
                  {isOpen && (
                    <div className="blist">
                      {phase.books.map(({book,chapters})=>{
                        const bd=bookDone(book,chapters);
                        const bOpen=expandedBook===book;
                        return (
                          <div key={book} className="brow">
                            <div className="bhead" onClick={()=>setExpandedBook(bOpen?null:book)}>
                              <span style={{fontSize:13,color:bd===chapters?SAGE:"rgba(28,20,16,0.2)"}}>{bd===chapters?"✓":"○"}</span>
                              <span className="bname">{book}</span>
                              <span className="bprog">{bd}/{chapters} ch</span>
                              <span className={`bchev ${bOpen?"open":""}`}>▼</span>
                            </div>
                            {bOpen && (
                              <div className="chgrid">
                                {Array.from({length:chapters},(_,i)=>i+1).map(ch=>{
                                  const isHovered = hoveredChapter?.book===book && hoveredChapter?.ch===ch;
                                  const ref = `${book} ${ch}`;
                                  return (
                                    <div key={ch} style={{position:"relative"}}
                                      onMouseEnter={()=>setHoveredChapter({book,ch})}
                                      onMouseLeave={()=>setHoveredChapter(null)}>
                                      <button className={`chbtn ${isChDone(book,ch)?"done":""}`}
                                        onClick={()=>toggleChapter(book,ch)}>{ch}</button>
                                      {isHovered && (
                                        <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:INK,border:`1px solid ${GOLD}`,borderRadius:3,padding:"6px 0",zIndex:100,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
                                          <div style={{fontSize:11,color:GOLD,letterSpacing:1,padding:"0 12px 6px",textAlign:"center",borderBottom:`1px solid rgba(201,168,76,0.2)`}}>{ref}</div>
                                          {[
                                            ["📖 Study", ()=>{ setCurrentPassage(ref); setMessages([]); saveToLog(ref); setTab("chat"); callClaude(`Please explain ${ref}. Cover context, key themes, cross-references, and life application.`, ref); setHoveredChapter(null); }],
                                            ["❓ Quiz", ()=>{ setCurrentPassage(ref); setMessages([]); saveToLog(ref); setTab("chat"); callClaude(`Quiz me on ${ref} with 3-5 questions — mix comprehension and reflection. Number each question.`, ref); setHoveredChapter(null); }],
                                            [isChDone(book,ch) ? "○ Unmark" : "✓ Mark done", ()=>{ toggleChapter(book,ch); setHoveredChapter(null); }],
                                          ].map(([label, action])=>(
                                            <button key={label} onClick={action} style={{display:"block",width:"100%",background:"none",border:"none",color:PARCHMENT,fontSize:13,padding:"6px 14px",cursor:"pointer",textAlign:"left",fontFamily:"'EB Garamond',serif",transition:"background 0.15s"}}
                                              onMouseEnter={e=>e.target.style.background="rgba(201,168,76,0.12)"}
                                              onMouseLeave={e=>e.target.style.background="none"}>
                                              {label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab==="progress" && (
          <div className="content">
            <h2 className="stitle">My Study Journey</h2>
            <div className="srow">
              <div className="sbox"><span className="snum">{studyLog.length}</span><div className="slabel">Passages Studied</div></div>
              <div className="sbox"><span className="snum">{new Set(studyLog.map(e=>e.date)).size}</span><div className="slabel">Study Days</div></div>
              <div className="sbox"><span className="snum">{totalDone}</span><div className="slabel">Chapters Done</div></div>
            </div>
            {studyLog.length===0?(
              <div style={{textAlign:"center",padding:"48px",color:"rgba(28,20,16,0.3)",fontStyle:"italic",border:"1.5px dashed rgba(201,168,76,0.4)",borderRadius:2}}>
                <p>No passages studied yet.</p>
                <p style={{marginTop:8,fontSize:13}}>Head to Study to begin your journey.</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {studyLog.map((entry,i)=>(
                  <div key={i} className="lentry">
                    <div>
                      <div className="lpsg">{entry.passage}</div>
                      <div className="ldate">{entry.date}{savedConvos[entry.passage]?<span style={{marginLeft:8,color:SAGE,fontSize:11}}>● saved discussion</span>:null}</div>
                    </div>
                    <button className="lbtn" onClick={()=>{
                      const existing=savedConvos[entry.passage];
                      setCurrentPassage(entry.passage);
                      setMessages(existing?existing.messages:[]);
                      setTab("chat");
                    }}>Revisit</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
