import React, { useState, useEffect, useRef } from "react";
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{-webkit-text-size-adjust:100%;}
body{font-family:'Nunito',sans-serif;background:#0f0f14;color:#f0f0f5;overflow-x:hidden;-webkit-tap-highlight-color:transparent;}
:root{
  --green:#4ade80;--green-dark:#16a34a;--green-glow:rgba(74,222,128,0.3);
  --blue:#38bdf8;--blue-dark:#0284c7;
  --purple:#a78bfa;--purple-dark:#7c3aed;
  --orange:#fb923c;--red:#f87171;--yellow:#fbbf24;
  --bg:#0f0f14;--bg2:#1a1a24;--bg3:#22222f;--bg4:#2a2a3a;
  --border:rgba(255,255,255,0.08);--border2:rgba(255,255,255,0.15);
  --text1:#f0f0f5;--text2:#9090a8;--text3:#5a5a70;
  --nav-h:64px;
  --safe-bottom:env(safe-area-inset-bottom, 0px);
  --safe-top:env(safe-area-inset-top, 0px);
}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{0%{transform:scale(.85);opacity:0}65%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--green-glow)}50%{box-shadow:0 0 40px var(--green-glow),0 0 60px var(--green-glow)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0) scale(1);opacity:1}100%{transform:translateY(-200px) rotate(720deg) scale(0);opacity:0}}
@keyframes toxicPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.01)}}
@keyframes typingDot{0%,80%,100%{opacity:0;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
@keyframes starPop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
.btn-press{transition:transform .1s,box-shadow .1s;}
.btn-press:active:not(:disabled){transform:scale(.96)!important;}
input,textarea{font-family:'Nunito',sans-serif;}
input:focus,textarea:focus{outline:none;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:var(--bg2);}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:4px;}
.chat-msg{animation:fadeUp .25s ease;}
.typing-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--text3);margin:0 2px;animation:typingDot 1.2s infinite;}
.typing-dot:nth-child(2){animation-delay:.2s;}
.typing-dot:nth-child(3){animation-delay:.4s;}
.star-pop{animation:starPop .4s cubic-bezier(.4,0,.2,1) forwards;}
.scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.scroll-x::-webkit-scrollbar{display:none;}
.scroll-y{overflow-y:auto;-webkit-overflow-scrolling:touch;}
/* Mobile-first grid tweaks */
@media(max-width:380px){
  .modes-grid{grid-template-columns:1fr 1fr!important;}
  .stats-grid{grid-template-columns:repeat(3,1fr)!important;}
}
@media(min-width:600px){
  .main-container{max-width:600px;margin:0 auto;}
  .session-container{max-width:520px;margin:0 auto;}
}
`;
// ─── API BASE URL ─────────────────────────────────────────────────────────────
const API_URL = "http://localhost:8080/api";
// ─── SRS ─────────────────────────────────────────────────────────────────────
const SRS = {
  nextReview(card, quality) {
    const now = Date.now();
    let { interval = 0, repetitions = 0, easeFactor = 2.5, lapses = 0 } = card.srs || {};
    if (quality < 3) {
      repetitions = 0; interval = quality === 2 ? 1 : 0; lapses += 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 3;
      else interval = Math.round(interval * easeFactor);
      easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      repetitions += 1;
    }
    interval = Math.min(interval, lapses > 3 ? 14 : 90);
    return { interval, repetitions, easeFactor, lapses, nextReview: now + interval * 86400000, lastReview: now, lastQuality: quality };
  },
  isDue(card) { return !card.srs || Date.now() >= card.srs.nextReview; },
  getDueCards(cards) { return cards.filter(c => this.isDue(c)); },
  getLevel(card) {
    const r = card.srs?.repetitions || 0;
    if (r === 0) return "new"; if (r <= 2) return "learning"; if (r <= 5) return "reviewing"; return "mastered";
  },
  getAlmostForgotten(cards) {
    return cards.filter(c => { if (!c.srs) return false; const t = c.srs.nextReview - Date.now(); return t > 0 && t < 3600000 * 4; });
  }
};
// ─── ENGLISH WORDS DATABASE ────────────────────────────────────────────────
const EN_WORDS = [
  {id:"a1_1",en:"Hello",uk:"Привіт",transcription:"/həˈloʊ/",example:"Hello! How are you?",tag:"basics",level:"A1"},
  {id:"a1_2",en:"Goodbye",uk:"До побачення",transcription:"/ˌɡʊdˈbaɪ/",example:"Goodbye! See you tomorrow.",tag:"basics",level:"A1"},
  {id:"a1_3",en:"Yes",uk:"Так",transcription:"/jes/",example:"Yes, I understand.",tag:"basics",level:"A1"},
  {id:"a1_4",en:"No",uk:"Ні",transcription:"/noʊ/",example:"No, thank you.",tag:"basics",level:"A1"},
  {id:"a1_5",en:"Please",uk:"Будь ласка",transcription:"/pliːz/",example:"Can you help me, please?",tag:"basics",level:"A1"},
  {id:"a1_6",en:"Thank you",uk:"Дякую",transcription:"/ˈθæŋk juː/",example:"Thank you for your help.",tag:"basics",level:"A1"},
  {id:"a1_7",en:"Sorry",uk:"Вибачте",transcription:"/ˈsɒr.i/",example:"Sorry, I didn't mean that.",tag:"basics",level:"A1"},
  {id:"a1_8",en:"Name",uk:"Ім'я",transcription:"/neɪm/",example:"What is your name?",tag:"basics",level:"A1"},
  {id:"a1_9",en:"Apple",uk:"Яблуко",transcription:"/ˈæp.əl/",example:"I eat an apple every day.",tag:"food",level:"A1"},
  {id:"a1_10",en:"Water",uk:"Вода",transcription:"/ˈwɔː.tər/",example:"Can I have some water?",tag:"food",level:"A1"},
  {id:"a1_11",en:"Bread",uk:"Хліб",transcription:"/bred/",example:"Fresh bread smells amazing.",tag:"food",level:"A1"},
  {id:"a1_12",en:"House",uk:"Будинок",transcription:"/haʊs/",example:"I live in a big house.",tag:"home",level:"A1"},
  {id:"a1_13",en:"Car",uk:"Автомобіль",transcription:"/kɑːr/",example:"My car is red.",tag:"transport",level:"A1"},
  {id:"a1_14",en:"Dog",uk:"Собака",transcription:"/dɒɡ/",example:"The dog is very friendly.",tag:"animals",level:"A1"},
  {id:"a1_15",en:"Cat",uk:"Кіт",transcription:"/kæt/",example:"The cat sleeps all day.",tag:"animals",level:"A1"},
  {id:"a1_16",en:"Big",uk:"Великий",transcription:"/bɪɡ/",example:"That is a big building.",tag:"adjectives",level:"A1"},
  {id:"a1_17",en:"Small",uk:"Маленький",transcription:"/smɔːl/",example:"She has a small dog.",tag:"adjectives",level:"A1"},
  {id:"a1_18",en:"Good",uk:"Добре",transcription:"/ɡʊd/",example:"This is a good idea.",tag:"adjectives",level:"A1"},
  {id:"a1_19",en:"Bad",uk:"Погане",transcription:"/bæd/",example:"That was a bad decision.",tag:"adjectives",level:"A1"},
  {id:"a1_20",en:"Day",uk:"День",transcription:"/deɪ/",example:"Have a good day!",tag:"time",level:"A1"},
  {id:"a1_21",en:"Night",uk:"Ніч",transcription:"/naɪt/",example:"Good night, sleep well.",tag:"time",level:"A1"},
  {id:"a1_22",en:"Food",uk:"Їжа",transcription:"/fuːd/",example:"The food here is delicious.",tag:"food",level:"A1"},
  {id:"a1_23",en:"Work",uk:"Робота",transcription:"/wɜːrk/",example:"I go to work every day.",tag:"work",level:"A1"},
  {id:"a1_24",en:"School",uk:"Школа",transcription:"/skuːl/",example:"She goes to school by bus.",tag:"education",level:"A1"},
  {id:"a1_25",en:"Friend",uk:"Друг",transcription:"/frend/",example:"He is my best friend.",tag:"people",level:"A1"},
  {id:"a1_26",en:"Family",uk:"Сім'я",transcription:"/ˈfæm.ɪ.li/",example:"My family is very important to me.",tag:"people",level:"A1"},
  {id:"a1_27",en:"Time",uk:"Час",transcription:"/taɪm/",example:"What time is it?",tag:"time",level:"A1"},
  {id:"a1_28",en:"Money",uk:"Гроші",transcription:"/ˈmʌn.i/",example:"I need some money.",tag:"basics",level:"A1"},
  {id:"a1_29",en:"Book",uk:"Книга",transcription:"/bʊk/",example:"I love reading books.",tag:"education",level:"A1"},
  {id:"a1_30",en:"Phone",uk:"Телефон",transcription:"/fəʊn/",example:"Can I use your phone?",tag:"tech",level:"A1"},
  {id:"a1_31",en:"Milk",uk:"Молоко",transcription:"/mɪlk/",example:"I drink milk every morning.",tag:"food",level:"A1"},
  {id:"a1_32",en:"Egg",uk:"Яйце",transcription:"/eɡ/",example:"I had an egg for breakfast.",tag:"food",level:"A1"},
  {id:"a1_33",en:"Chair",uk:"Стілець",transcription:"/tʃeər/",example:"Please sit on this chair.",tag:"home",level:"A1"},
  {id:"a1_34",en:"Table",uk:"Стіл",transcription:"/ˈteɪ.bəl/",example:"The table is in the kitchen.",tag:"home",level:"A1"},
  {id:"a1_35",en:"Door",uk:"Двері",transcription:"/dɔːr/",example:"Please close the door.",tag:"home",level:"A1"},
  {id:"a1_36",en:"Window",uk:"Вікно",transcription:"/ˈwɪn.dəʊ/",example:"Open the window, please.",tag:"home",level:"A1"},
  {id:"a1_37",en:"Bed",uk:"Ліжко",transcription:"/bed/",example:"I go to bed at 10pm.",tag:"home",level:"A1"},
  {id:"a1_38",en:"Walk",uk:"Ходити",transcription:"/wɔːk/",example:"I walk to school.",tag:"basics",level:"A1"},
  {id:"a1_39",en:"Run",uk:"Бігти",transcription:"/rʌn/",example:"I run in the park.",tag:"basics",level:"A1"},
  {id:"a1_40",en:"Eat",uk:"Їсти",transcription:"/iːt/",example:"I eat breakfast at 7am.",tag:"food",level:"A1"},
  {id:"a1_41",en:"Drink",uk:"Пити",transcription:"/drɪŋk/",example:"I drink coffee in the morning.",tag:"food",level:"A1"},
  {id:"a1_42",en:"Sleep",uk:"Спати",transcription:"/sliːp/",example:"I sleep 8 hours a night.",tag:"basics",level:"A1"},
  {id:"a1_43",en:"Read",uk:"Читати",transcription:"/riːd/",example:"I read every evening.",tag:"education",level:"A1"},
  {id:"a1_44",en:"Write",uk:"Писати",transcription:"/raɪt/",example:"She writes in her diary.",tag:"education",level:"A1"},
  {id:"a1_45",en:"Speak",uk:"Говорити",transcription:"/spiːk/",example:"Can you speak English?",tag:"basics",level:"A1"},
  {id:"a1_46",en:"Listen",uk:"Слухати",transcription:"/ˈlɪs.ən/",example:"Please listen carefully.",tag:"basics",level:"A1"},
  {id:"a1_47",en:"See",uk:"Бачити",transcription:"/siː/",example:"I can see the mountains.",tag:"basics",level:"A1"},
  {id:"a1_48",en:"Hot",uk:"Гарячий",transcription:"/hɒt/",example:"The coffee is very hot.",tag:"adjectives",level:"A1"},
  {id:"a1_49",en:"Cold",uk:"Холодний",transcription:"/kəʊld/",example:"It is cold outside today.",tag:"adjectives",level:"A1"},
  {id:"a1_50",en:"New",uk:"Новий",transcription:"/njuː/",example:"I have a new phone.",tag:"adjectives",level:"A1"},
  {id:"a1_51",en:"Old",uk:"Старий",transcription:"/əʊld/",example:"This is an old building.",tag:"adjectives",level:"A1"},
  {id:"a1_52",en:"Happy",uk:"Щасливий",transcription:"/ˈhæp.i/",example:"I feel very happy today.",tag:"emotions",level:"A1"},
  {id:"a1_53",en:"One",uk:"Один",transcription:"/wʌn/",example:"I have one brother.",tag:"basics",level:"A1"},
  {id:"a1_54",en:"Two",uk:"Два",transcription:"/tuː/",example:"She has two cats.",tag:"basics",level:"A1"},
  {id:"a1_55",en:"Three",uk:"Три",transcription:"/θriː/",example:"We need three chairs.",tag:"basics",level:"A1"},
  {id:"a1_56",en:"Red",uk:"Червоний",transcription:"/red/",example:"I like red apples.",tag:"adjectives",level:"A1"},
  {id:"a1_57",en:"Blue",uk:"Синій",transcription:"/bluː/",example:"The sky is blue today.",tag:"adjectives",level:"A1"},
  {id:"a1_58",en:"Green",uk:"Зелений",transcription:"/ɡriːn/",example:"Grass is green.",tag:"adjectives",level:"A1"},
  {id:"a1_59",en:"Bus",uk:"Автобус",transcription:"/bʌs/",example:"Take the bus to school.",tag:"transport",level:"A1"},
  {id:"a1_60",en:"Tree",uk:"Дерево",transcription:"/triː/",example:"There is a big tree in the garden.",tag:"nature",level:"A1"},
  {id:"a2_1",en:"Airport",uk:"Аеропорт",transcription:"/ˈeə.pɔːt/",example:"We arrived at the airport early.",tag:"travel",level:"A2"},
  {id:"a2_2",en:"Ticket",uk:"Квиток",transcription:"/ˈtɪk.ɪt/",example:"I need a ticket to London.",tag:"travel",level:"A2"},
  {id:"a2_3",en:"Hotel",uk:"Готель",transcription:"/həʊˈtel/",example:"The hotel has a nice view.",tag:"travel",level:"A2"},
  {id:"a2_4",en:"Restaurant",uk:"Ресторан",transcription:"/ˈres.tər.ɒnt/",example:"Let's go to a restaurant.",tag:"food",level:"A2"},
  {id:"a2_5",en:"Coffee",uk:"Кава",transcription:"/ˈkɒf.i/",example:"I need coffee in the morning.",tag:"food",level:"A2"},
  {id:"a2_6",en:"Chicken",uk:"Курка",transcription:"/ˈtʃɪk.ɪn/",example:"She cooked chicken perfectly.",tag:"food",level:"A2"},
  {id:"a2_7",en:"Rice",uk:"Рис",transcription:"/raɪs/",example:"Rice is a staple food in Asia.",tag:"food",level:"A2"},
  {id:"a2_8",en:"Beautiful",uk:"Красивий",transcription:"/ˈbjuː.tɪ.fəl/",example:"What a beautiful sunset!",tag:"adjectives",level:"A2"},
  {id:"a2_9",en:"Interesting",uk:"Цікавий",transcription:"/ˈɪn.trɪ.stɪŋ/",example:"That's a very interesting story.",tag:"adjectives",level:"A2"},
  {id:"a2_10",en:"Expensive",uk:"Дорогий",transcription:"/ɪkˈspen.sɪv/",example:"This car is too expensive.",tag:"adjectives",level:"A2"},
  {id:"a2_11",en:"Weather",uk:"Погода",transcription:"/ˈweð.ər/",example:"The weather is great today.",tag:"nature",level:"A2"},
  {id:"a2_12",en:"Market",uk:"Ринок",transcription:"/ˈmɑː.kɪt/",example:"Let's go to the market.",tag:"shopping",level:"A2"},
  {id:"a2_13",en:"Luggage",uk:"Багаж",transcription:"/ˈlʌɡ.ɪdʒ/",example:"My luggage is very heavy.",tag:"travel",level:"A2"},
  {id:"a2_14",en:"Passport",uk:"Паспорт",transcription:"/ˈpɑːs.pɔːt/",example:"Don't forget your passport!",tag:"travel",level:"A2"},
  {id:"a2_15",en:"Exercise",uk:"Вправа",transcription:"/ˈek.sə.saɪz/",example:"Daily exercise is important.",tag:"health",level:"A2"},
  {id:"a2_16",en:"Hospital",uk:"Лікарня",transcription:"/ˈhɒs.pɪ.təl/",example:"He went to the hospital.",tag:"health",level:"A2"},
  {id:"a2_17",en:"Sad",uk:"Сумний",transcription:"/sæd/",example:"Why are you so sad?",tag:"emotions",level:"A2"},
  {id:"a2_18",en:"Hungry",uk:"Голодний",transcription:"/ˈhʌŋ.ɡri/",example:"I'm really hungry right now.",tag:"emotions",level:"A2"},
  {id:"a2_19",en:"Tired",uk:"Втомлений",transcription:"/ˈtaɪəd/",example:"I'm so tired after work.",tag:"emotions",level:"A2"},
  {id:"a2_20",en:"Early",uk:"Рано",transcription:"/ˈɜː.li/",example:"I wake up early every day.",tag:"time",level:"A2"},
  {id:"a2_21",en:"Late",uk:"Пізно",transcription:"/leɪt/",example:"Sorry, I'm late!",tag:"time",level:"A2"},
  {id:"a2_22",en:"Together",uk:"Разом",transcription:"/təˈɡeð.ər/",example:"Let's do this together.",tag:"basics",level:"A2"},
  {id:"a2_23",en:"Always",uk:"Завжди",transcription:"/ˈɔːl.weɪz/",example:"She always arrives on time.",tag:"basics",level:"A2"},
  {id:"a2_24",en:"Never",uk:"Ніколи",transcription:"/ˈnev.ər/",example:"I never eat fast food.",tag:"basics",level:"A2"},
  {id:"a2_25",en:"Sometimes",uk:"Іноді",transcription:"/ˈsʌm.taɪmz/",example:"I sometimes work late.",tag:"basics",level:"A2"},
  {id:"a2_26",en:"Everywhere",uk:"Всюди",transcription:"/ˈev.ri.weər/",example:"Tourists are everywhere.",tag:"basics",level:"A2"},
  {id:"a2_27",en:"Problem",uk:"Проблема",transcription:"/ˈprɒb.ləm/",example:"We have a big problem.",tag:"basics",level:"A2"},
  {id:"a2_28",en:"Answer",uk:"Відповідь",transcription:"/ˈɑːn.sər/",example:"What's the answer?",tag:"basics",level:"A2"},
  {id:"a2_29",en:"Question",uk:"Питання",transcription:"/ˈkwes.tʃən/",example:"I have a question.",tag:"basics",level:"A2"},
  {id:"a2_30",en:"City",uk:"Місто",transcription:"/ˈsɪt.i/",example:"I live in a big city.",tag:"travel",level:"A2"},
  {id:"a2_31",en:"Street",uk:"Вулиця",transcription:"/striːt/",example:"What street do you live on?",tag:"travel",level:"A2"},
  {id:"a2_32",en:"Shop",uk:"Магазин",transcription:"/ʃɒp/",example:"I go to the shop every day.",tag:"shopping",level:"A2"},
  {id:"a2_33",en:"Price",uk:"Ціна",transcription:"/praɪs/",example:"What is the price of this?",tag:"shopping",level:"A2"},
  {id:"a2_34",en:"Cheap",uk:"Дешевий",transcription:"/tʃiːp/",example:"This bag is very cheap.",tag:"adjectives",level:"A2"},
  {id:"a2_35",en:"Clean",uk:"Чистий",transcription:"/kliːn/",example:"Keep your room clean.",tag:"adjectives",level:"A2"},
  {id:"a2_36",en:"Dirty",uk:"Брудний",transcription:"/ˈdɜː.ti/",example:"My shoes are dirty.",tag:"adjectives",level:"A2"},
  {id:"a2_37",en:"Fast",uk:"Швидкий",transcription:"/fɑːst/",example:"He is a fast runner.",tag:"adjectives",level:"A2"},
  {id:"a2_38",en:"Slow",uk:"Повільний",transcription:"/sləʊ/",example:"The internet is very slow today.",tag:"adjectives",level:"A2"},
  {id:"a2_39",en:"Rain",uk:"Дощ",transcription:"/reɪn/",example:"It rains a lot in autumn.",tag:"nature",level:"A2"},
  {id:"a2_40",en:"Snow",uk:"Сніг",transcription:"/snəʊ/",example:"Children love playing in snow.",tag:"nature",level:"A2"},
  {id:"a2_41",en:"Sun",uk:"Сонце",transcription:"/sʌn/",example:"The sun is shining today.",tag:"nature",level:"A2"},
  {id:"a2_42",en:"Mountain",uk:"Гора",transcription:"/ˈmaʊn.tɪn/",example:"I love hiking in the mountains.",tag:"nature",level:"A2"},
  {id:"a2_43",en:"River",uk:"Річка",transcription:"/ˈrɪv.ər/",example:"The river is very long.",tag:"nature",level:"A2"},
  {id:"a2_44",en:"Doctor",uk:"Лікар",transcription:"/ˈdɒk.tər/",example:"I went to see the doctor.",tag:"health",level:"A2"},
  {id:"a2_45",en:"Medicine",uk:"Ліки",transcription:"/ˈmed.ɪ.sɪn/",example:"Take this medicine twice a day.",tag:"health",level:"A2"},
  {id:"a2_46",en:"Birthday",uk:"День народження",transcription:"/ˈbɜːθ.deɪ/",example:"Happy birthday to you!",tag:"basics",level:"A2"},
  {id:"a2_47",en:"Holiday",uk:"Свято",transcription:"/ˈhɒl.ɪ.deɪ/",example:"We have a holiday next week.",tag:"time",level:"A2"},
  {id:"a2_48",en:"Weekend",uk:"Вихідні",transcription:"/ˌwiːkˈend/",example:"What do you do on weekends?",tag:"time",level:"A2"},
  {id:"a2_49",en:"Morning",uk:"Ранок",transcription:"/ˈmɔː.nɪŋ/",example:"Good morning everyone!",tag:"time",level:"A2"},
  {id:"a2_50",en:"Evening",uk:"Вечір",transcription:"/ˈiːv.nɪŋ/",example:"I relax in the evening.",tag:"time",level:"A2"},
  {id:"a2_51",en:"Minute",uk:"Хвилина",transcription:"/ˈmɪn.ɪt/",example:"Wait a minute, please.",tag:"time",level:"A2"},
  {id:"a2_52",en:"Hour",uk:"Година",transcription:"/ˈaʊər/",example:"The meeting lasts one hour.",tag:"time",level:"A2"},
  {id:"a2_53",en:"Week",uk:"Тиждень",transcription:"/wiːk/",example:"I go to the gym twice a week.",tag:"time",level:"A2"},
  {id:"a2_54",en:"Month",uk:"Місяць",transcription:"/mʌnθ/",example:"She visits every month.",tag:"time",level:"A2"},
  {id:"a2_55",en:"Year",uk:"Рік",transcription:"/jɪər/",example:"This year is very busy.",tag:"time",level:"A2"},
  {id:"a2_56",en:"Knife",uk:"Ніж",transcription:"/naɪf/",example:"Use a knife to cut the bread.",tag:"home",level:"A2"},
  {id:"a2_57",en:"Fork",uk:"Виделка",transcription:"/fɔːk/",example:"I need a fork and spoon.",tag:"home",level:"A2"},
  {id:"a2_58",en:"Plate",uk:"Тарілка",transcription:"/pleɪt/",example:"Put it on the plate.",tag:"home",level:"A2"},
  {id:"a2_59",en:"Cup",uk:"Чашка",transcription:"/kʌp/",example:"I want a cup of tea.",tag:"home",level:"A2"},
  {id:"a2_60",en:"Kitchen",uk:"Кухня",transcription:"/ˈkɪtʃ.ɪn/",example:"She is cooking in the kitchen.",tag:"home",level:"A2"},
  {id:"b1_1",en:"Deadline",uk:"Дедлайн",transcription:"/ˈded.laɪn/",example:"We must meet the deadline.",tag:"business",level:"B1"},
  {id:"b1_2",en:"Revenue",uk:"Дохід",transcription:"/ˈrev.ə.njuː/",example:"Revenue increased by 20%.",tag:"business",level:"B1"},
  {id:"b1_3",en:"Meeting",uk:"Зустріч",transcription:"/ˈmiː.tɪŋ/",example:"The meeting starts at 10am.",tag:"business",level:"B1"},
  {id:"b1_4",en:"Strategy",uk:"Стратегія",transcription:"/ˈstræt.ɪ.dʒi/",example:"We need a new strategy.",tag:"business",level:"B1"},
  {id:"b1_5",en:"Awesome",uk:"Круто",transcription:"/ˈɔː.səm/",example:"That concert was awesome!",tag:"slang",level:"B1"},
  {id:"b1_6",en:"Chill",uk:"Розслабитися",transcription:"/tʃɪl/",example:"Let's just chill this weekend.",tag:"slang",level:"B1"},
  {id:"b1_7",en:"Vibe",uk:"Атмосфера",transcription:"/vaɪb/",example:"This place has a great vibe.",tag:"slang",level:"B1"},
  {id:"b1_8",en:"Grateful",uk:"Вдячний",transcription:"/ˈɡreɪt.fəl/",example:"I am grateful for your help.",tag:"emotions",level:"B1"},
  {id:"b1_9",en:"Anxious",uk:"Тривожний",transcription:"/ˈæŋk.ʃəs/",example:"She felt anxious before the exam.",tag:"emotions",level:"B1"},
  {id:"b1_10",en:"Confident",uk:"Впевнений",transcription:"/ˈkɒn.fɪ.dənt/",example:"Be confident in yourself.",tag:"emotions",level:"B1"},
  {id:"b1_11",en:"Achievement",uk:"Досягнення",transcription:"/əˈtʃiːv.mənt/",example:"This is a great achievement.",tag:"work",level:"B1"},
  {id:"b1_12",en:"Environment",uk:"Навколишнє середовище",transcription:"/ɪnˈvaɪ.rən.mənt/",example:"We must protect the environment.",tag:"nature",level:"B1"},
  {id:"b1_13",en:"Opportunity",uk:"Можливість",transcription:"/ˌɒp.əˈtjuː.nɪ.ti/",example:"This is a great opportunity.",tag:"work",level:"B1"},
  {id:"b1_14",en:"Challenge",uk:"Виклик",transcription:"/ˈtʃæl.ɪndʒ/",example:"This is a real challenge.",tag:"work",level:"B1"},
  {id:"b1_15",en:"Success",uk:"Успіх",transcription:"/səkˈses/",example:"Hard work leads to success.",tag:"work",level:"B1"},
  {id:"b1_16",en:"Failure",uk:"Невдача",transcription:"/ˈfeɪ.ljər/",example:"Failure is a lesson.",tag:"work",level:"B1"},
  {id:"b1_17",en:"Decision",uk:"Рішення",transcription:"/dɪˈsɪʒ.ən/",example:"I made a tough decision.",tag:"basics",level:"B1"},
  {id:"b1_18",en:"Experience",uk:"Досвід",transcription:"/ɪkˈspɪə.ri.əns/",example:"I have a lot of experience.",tag:"work",level:"B1"},
  {id:"b1_19",en:"Relationship",uk:"Стосунки",transcription:"/rɪˈleɪ.ʃən.ʃɪp/",example:"Good relationships matter.",tag:"people",level:"B1"},
  {id:"b1_20",en:"Responsibility",uk:"Відповідальність",transcription:"/rɪˌspɒn.sɪˈbɪl.ɪ.ti/",example:"Take responsibility for your actions.",tag:"basics",level:"B1"},
  {id:"b1_21",en:"Recommend",uk:"Рекомендувати",transcription:"/ˌrek.əˈmend/",example:"I recommend this book.",tag:"basics",level:"B1"},
  {id:"b1_22",en:"Approximately",uk:"Приблизно",transcription:"/əˈprɒk.sɪ.mət.li/",example:"It costs approximately $50.",tag:"basics",level:"B1"},
  {id:"b1_23",en:"Although",uk:"Хоча",transcription:"/ɔːlˈðəʊ/",example:"Although it's hard, I'll try.",tag:"basics",level:"B1"},
  {id:"b1_24",en:"Symptom",uk:"Симптом",transcription:"/ˈsɪmp.təm/",example:"What are the symptoms?",tag:"health",level:"B1"},
  {id:"b1_25",en:"Curious",uk:"Допитливий",transcription:"/ˈkjʊə.ri.əs/",example:"Kids are naturally curious.",tag:"emotions",level:"B1"},
  {id:"b1_26",en:"Network",uk:"Мережа",transcription:"/ˈnet.wɜːk/",example:"The network is down.",tag:"tech",level:"B1"},
  {id:"b1_27",en:"Database",uk:"База даних",transcription:"/ˈdeɪ.tə.beɪs/",example:"Store it in the database.",tag:"tech",level:"B1"},
  {id:"b1_28",en:"Algorithm",uk:"Алгоритм",transcription:"/ˈæl.ɡə.rɪ.ðəm/",example:"The algorithm sorts data.",tag:"tech",level:"B1"},
  {id:"b1_29",en:"Feedback",uk:"Зворотній зв'язок",transcription:"/ˈfiːd.bæk/",example:"I need your feedback.",tag:"business",level:"B1"},
  {id:"b1_30",en:"Budget",uk:"Бюджет",transcription:"/ˈbʌdʒ.ɪt/",example:"We are over budget.",tag:"business",level:"B1"},
  {id:"b1_31",en:"Negotiate",uk:"Переговорити",transcription:"/nɪˈɡəʊ.ʃi.eɪt/",example:"Let's negotiate the price.",tag:"business",level:"B1"},
  {id:"b1_32",en:"Deadline",uk:"Термін",transcription:"/ˈded.laɪn/",example:"The deadline is tomorrow.",tag:"business",level:"B1"},
  {id:"b1_33",en:"Project",uk:"Проект",transcription:"/ˈprɒdʒ.ekt/",example:"We finished the project on time.",tag:"work",level:"B1"},
  {id:"b1_34",en:"Contract",uk:"Контракт",transcription:"/ˈkɒn.trækt/",example:"Sign the contract here.",tag:"business",level:"B1"},
  {id:"b1_35",en:"Complaint",uk:"Скарга",transcription:"/kəmˈpleɪnt/",example:"I have a complaint about this product.",tag:"business",level:"B1"},
  {id:"b1_36",en:"Polite",uk:"Ввічливий",transcription:"/pəˈlaɪt/",example:"Always be polite to customers.",tag:"adjectives",level:"B1"},
  {id:"b1_37",en:"Brave",uk:"Хоробрий",transcription:"/breɪv/",example:"She was very brave.",tag:"adjectives",level:"B1"},
  {id:"b1_38",en:"Patient",uk:"Терплячий",transcription:"/ˈpeɪ.ʃənt/",example:"Be patient, it takes time.",tag:"adjectives",level:"B1"},
  {id:"b1_39",en:"Creative",uk:"Творчий",transcription:"/kriˈeɪ.tɪv/",example:"She is very creative.",tag:"adjectives",level:"B1"},
  {id:"b1_40",en:"Generous",uk:"Щедрий",transcription:"/ˈdʒen.ər.əs/",example:"He is very generous with his time.",tag:"adjectives",level:"B1"},
  {id:"b1_41",en:"Pollution",uk:"Забруднення",transcription:"/pəˈluː.ʃən/",example:"Air pollution is a major problem.",tag:"nature",level:"B1"},
  {id:"b1_42",en:"Climate",uk:"Клімат",transcription:"/ˈklaɪ.mɪt/",example:"The climate is changing rapidly.",tag:"nature",level:"B1"},
  {id:"b1_43",en:"Energy",uk:"Енергія",transcription:"/ˈen.ə.dʒi/",example:"Solar energy is renewable.",tag:"nature",level:"B1"},
  {id:"b1_44",en:"Technology",uk:"Технологія",transcription:"/tekˈnɒl.ə.dʒi/",example:"Technology changes fast.",tag:"tech",level:"B1"},
  {id:"b1_45",en:"Internet",uk:"Інтернет",transcription:"/ˈɪn.tə.net/",example:"The internet connects everyone.",tag:"tech",level:"B1"},
  {id:"b1_46",en:"Software",uk:"Програмне забезпечення",transcription:"/ˈsɒft.weər/",example:"Install the software first.",tag:"tech",level:"B1"},
  {id:"b1_47",en:"Password",uk:"Пароль",transcription:"/ˈpɑːs.wɜːd/",example:"Change your password regularly.",tag:"tech",level:"B1"},
  {id:"b1_48",en:"Download",uk:"Завантажити",transcription:"/ˌdaʊnˈləʊd/",example:"Download the app on your phone.",tag:"tech",level:"B1"},
  {id:"b1_49",en:"Upload",uk:"Вивантажити",transcription:"/ˈʌp.ləʊd/",example:"Upload your photo here.",tag:"tech",level:"B1"},
  {id:"b1_50",en:"Message",uk:"Повідомлення",transcription:"/ˈmes.ɪdʒ/",example:"I sent her a message.",tag:"tech",level:"B1"},
  {id:"b1_51",en:"Promotion",uk:"Просування",transcription:"/prəˈməʊ.ʃən/",example:"She got a promotion at work.",tag:"work",level:"B1"},
  {id:"b1_52",en:"Salary",uk:"Зарплата",transcription:"/ˈsæl.ər.i/",example:"My salary increased this year.",tag:"work",level:"B1"},
  {id:"b1_53",en:"Interview",uk:"Співбесіда",transcription:"/ˈɪn.tə.vjuː/",example:"I have a job interview tomorrow.",tag:"work",level:"B1"},
  {id:"b1_54",en:"Resume",uk:"Резюме",transcription:"/ˈrez.jʊ.meɪ/",example:"Update your resume before applying.",tag:"work",level:"B1"},
  {id:"b1_55",en:"Colleague",uk:"Колега",transcription:"/ˈkɒl.iːɡ/",example:"My colleague helped me finish.",tag:"work",level:"B1"},
  {id:"b1_56",en:"Embarrassed",uk:"Збентежений",transcription:"/ɪmˈbær.əst/",example:"I felt embarrassed by my mistake.",tag:"emotions",level:"B1"},
  {id:"b1_57",en:"Frustrated",uk:"Розчарований",transcription:"/frʌˈstreɪ.tɪd/",example:"I'm so frustrated with this task.",tag:"emotions",level:"B1"},
  {id:"b1_58",en:"Excited",uk:"Збуджений",transcription:"/ɪkˈsaɪ.tɪd/",example:"She is excited about the trip.",tag:"emotions",level:"B1"},
  {id:"b1_59",en:"Surprised",uk:"Здивований",transcription:"/səˈpraɪzd/",example:"I was surprised by the news.",tag:"emotions",level:"B1"},
  {id:"b1_60",en:"Relieved",uk:"Полегшений",transcription:"/rɪˈliːvd/",example:"I felt relieved when it was over.",tag:"emotions",level:"B1"},
  {id:"b2_1",en:"Sophisticated",uk:"Витончений",transcription:"/səˈfɪs.tɪ.keɪ.tɪd/",example:"She has sophisticated taste.",tag:"adjectives",level:"B2"},
  {id:"b2_2",en:"Ambiguous",uk:"Неоднозначний",transcription:"/æmˈbɪɡ.ju.əs/",example:"The message was ambiguous.",tag:"adjectives",level:"B2"},
  {id:"b2_3",en:"Inevitable",uk:"Неминучий",transcription:"/ɪnˈev.ɪ.tə.bəl/",example:"Change is inevitable.",tag:"adjectives",level:"B2"},
  {id:"b2_4",en:"Eloquent",uk:"Красномовний",transcription:"/ˈel.ə.kwənt/",example:"She gave an eloquent speech.",tag:"adjectives",level:"B2"},
  {id:"b2_5",en:"Implement",uk:"Впровадити",transcription:"/ˈɪm.plɪ.ment/",example:"We need to implement changes.",tag:"business",level:"B2"},
  {id:"b2_6",en:"Sustainable",uk:"Стійкий",transcription:"/səˈsteɪ.nə.bəl/",example:"We need sustainable energy.",tag:"nature",level:"B2"},
  {id:"b2_7",en:"Hypothesis",uk:"Гіпотеза",transcription:"/haɪˈpɒθ.ɪ.sɪs/",example:"Test your hypothesis.",tag:"education",level:"B2"},
  {id:"b2_8",en:"Phenomenon",uk:"Явище",transcription:"/fɪˈnɒm.ɪ.nən/",example:"It's a rare phenomenon.",tag:"basics",level:"B2"},
  {id:"b2_9",en:"Perspective",uk:"Перспектива",transcription:"/pəˈspek.tɪv/",example:"Change your perspective.",tag:"basics",level:"B2"},
  {id:"b2_10",en:"Legit",uk:"Серйозно",transcription:"/lɪˈdʒɪt/",example:"Is this legit or a scam?",tag:"slang",level:"B2"},
  {id:"b2_11",en:"No cap",uk:"Без брехні",transcription:"/nəʊ kæp/",example:"That was incredible, no cap.",tag:"slang",level:"B2"},
  {id:"b2_12",en:"Slay",uk:"Підкорювати",transcription:"/sleɪ/",example:"She absolutely slayed that performance.",tag:"slang",level:"B2"},
  {id:"b2_13",en:"Vibe check",uk:"Перевірка настрою",transcription:"/vaɪb tʃek/",example:"Vibe check — how is everyone?",tag:"slang",level:"B2"},
  {id:"b2_14",en:"Crucial",uk:"Вирішальний",transcription:"/ˈkruː.ʃəl/",example:"This is a crucial moment.",tag:"adjectives",level:"B2"},
  {id:"b2_15",en:"Paradox",uk:"Парадокс",transcription:"/ˈpær.ə.dɒks/",example:"It's a fascinating paradox.",tag:"basics",level:"B2"},
  {id:"b2_16",en:"Empathy",uk:"Емпатія",transcription:"/ˈem.pə.θi/",example:"Show empathy to others.",tag:"emotions",level:"B2"},
  {id:"b2_17",en:"Resilience",uk:"Стійкість",transcription:"/rɪˈzɪl.i.əns/",example:"Resilience is key to success.",tag:"emotions",level:"B2"},
  {id:"b2_18",en:"Innovation",uk:"Інновація",transcription:"/ˌɪn.əˈveɪ.ʃən/",example:"Innovation drives progress.",tag:"business",level:"B2"},
  {id:"b2_19",en:"Framework",uk:"Рамки",transcription:"/ˈfreɪm.wɜːk/",example:"Use this framework.",tag:"tech",level:"B2"},
  {id:"b2_20",en:"Collaborate",uk:"Співпрацювати",transcription:"/kəˈlæb.ə.reɪt/",example:"We need to collaborate more.",tag:"work",level:"B2"},
  {id:"b2_21",en:"Advocate",uk:"Захищати",transcription:"/ˈæd.və.keɪt/",example:"She advocates for human rights.",tag:"basics",level:"B2"},
  {id:"b2_22",en:"Controversy",uk:"Суперечка",transcription:"/ˈkɒn.trə.vɜː.si/",example:"It caused a lot of controversy.",tag:"basics",level:"B2"},
  {id:"b2_23",en:"Demonstrate",uk:"Демонструвати",transcription:"/ˈdem.ən.streɪt/",example:"Please demonstrate the process.",tag:"basics",level:"B2"},
  {id:"b2_24",en:"Evaluation",uk:"Оцінка",transcription:"/ɪˌvæl.juˈeɪ.ʃən/",example:"The evaluation showed good results.",tag:"education",level:"B2"},
  {id:"b2_25",en:"Acknowledge",uk:"Визнавати",transcription:"/əkˈnɒl.ɪdʒ/",example:"She acknowledged the mistake.",tag:"basics",level:"B2"},
  {id:"b2_26",en:"Bias",uk:"Упередженість",transcription:"/ˈbaɪ.əs/",example:"We all have unconscious bias.",tag:"basics",level:"B2"},
  {id:"b2_27",en:"Integrity",uk:"Чесність",transcription:"/ɪnˈteɡ.rɪ.ti/",example:"Act with integrity at all times.",tag:"basics",level:"B2"},
  {id:"b2_28",en:"Objective",uk:"Об'єктивний",transcription:"/əbˈdʒek.tɪv/",example:"Try to be objective here.",tag:"adjectives",level:"B2"},
  {id:"b2_29",en:"Substantial",uk:"Суттєвий",transcription:"/səbˈstæn.ʃəl/",example:"A substantial improvement was made.",tag:"adjectives",level:"B2"},
  {id:"b2_30",en:"Controversial",uk:"Суперечливий",transcription:"/ˌkɒn.trəˈvɜː.ʃəl/",example:"This is a controversial topic.",tag:"adjectives",level:"B2"},
  {id:"c1_1",en:"Ubiquitous",uk:"Повсюдний",transcription:"/juːˈbɪk.wɪ.təs/",example:"Smartphones are ubiquitous.",tag:"adjectives",level:"C1"},
  {id:"c1_2",en:"Clandestine",uk:"Таємний",transcription:"/klænˈdes.tɪn/",example:"A clandestine operation.",tag:"adjectives",level:"C1"},
  {id:"c1_3",en:"Nuanced",uk:"Нюансований",transcription:"/ˈnjuː.ɑːnst/",example:"A nuanced argument.",tag:"adjectives",level:"C1"},
  {id:"c1_4",en:"Rhetoric",uk:"Риторика",transcription:"/ˈret.ər.ɪk/",example:"Political rhetoric.",tag:"basics",level:"C1"},
  {id:"c1_5",en:"Dichotomy",uk:"Дихотомія",transcription:"/daɪˈkɒt.ə.mi/",example:"The dichotomy of good and evil.",tag:"basics",level:"C1"},
  {id:"c1_6",en:"Pragmatic",uk:"Прагматичний",transcription:"/præɡˈmæt.ɪk/",example:"A pragmatic approach.",tag:"adjectives",level:"C1"},
  {id:"c1_7",en:"Paradigm",uk:"Парадигма",transcription:"/ˈpær.ə.daɪm/",example:"A paradigm shift.",tag:"basics",level:"C1"},
  {id:"c1_8",en:"Eloquence",uk:"Красномовність",transcription:"/ˈel.ə.kwəns/",example:"Her eloquence impressed everyone.",tag:"basics",level:"C1"},
  {id:"c1_9",en:"Exacerbate",uk:"Погіршувати",transcription:"/ɪɡˈzæs.ə.beɪt/",example:"Don't exacerbate the problem.",tag:"basics",level:"C1"},
  {id:"c1_10",en:"Ameliorate",uk:"Покращувати",transcription:"/əˈmiː.li.ə.reɪt/",example:"We must ameliorate conditions.",tag:"basics",level:"C1"},
  {id:"c1_11",en:"Ephemeral",uk:"Скороминущий",transcription:"/ɪˈfem.ər.əl/",example:"Fame can be ephemeral.",tag:"adjectives",level:"C1"},
  {id:"c1_12",en:"Juxtapose",uk:"Протиставляти",transcription:"/ˌdʒʌk.stəˈpəʊz/",example:"The author juxtaposes joy and sorrow.",tag:"basics",level:"C1"},
  {id:"c1_13",en:"Prerogative",uk:"Прерогатива",transcription:"/prɪˈrɒɡ.ə.tɪv/",example:"That's your prerogative.",tag:"basics",level:"C1"},
  {id:"c1_14",en:"Tangential",uk:"Дотичний",transcription:"/tænˈdʒen.ʃəl/",example:"That point is tangential to the main topic.",tag:"adjectives",level:"C1"},
  {id:"c1_15",en:"Corroborate",uk:"Підтверджувати",transcription:"/kəˈrɒb.ə.reɪt/",example:"Evidence corroborated her story.",tag:"basics",level:"C1"},
];
const ES_WORDS = [
  {id:"es_1",en:"Hola",uk:"Привіт",transcription:"/ˈo.la/",example:"¡Hola! ¿Cómo estás?",tag:"basics",level:"A1"},
  {id:"es_2",en:"Adiós",uk:"До побачення",transcription:"/a.ˈðjos/",example:"¡Adiós! Hasta mañana.",tag:"basics",level:"A1"},
  {id:"es_3",en:"Gracias",uk:"Дякую",transcription:"/ˈɡra.θjas/",example:"Muchas gracias por tu ayuda.",tag:"basics",level:"A1"},
  {id:"es_4",en:"Por favor",uk:"Будь ласка",transcription:"/por fa.ˈβor/",example:"Un café, por favor.",tag:"basics",level:"A1"},
  {id:"es_5",en:"Sí",uk:"Так",transcription:"/si/",example:"Sí, entiendo perfectamente.",tag:"basics",level:"A1"},
  {id:"es_6",en:"No",uk:"Ні",transcription:"/no/",example:"No, no quiero.",tag:"basics",level:"A1"},
  {id:"es_7",en:"Agua",uk:"Вода",transcription:"/ˈa.ɡwa/",example:"Necesito agua, por favor.",tag:"food",level:"A1"},
  {id:"es_8",en:"Casa",uk:"Будинок",transcription:"/ˈka.sa/",example:"Mi casa es grande.",tag:"home",level:"A1"},
  {id:"es_9",en:"Perro",uk:"Собака",transcription:"/ˈpe.ro/",example:"El perro es muy simpático.",tag:"animals",level:"A1"},
  {id:"es_10",en:"Gato",uk:"Кіт",transcription:"/ˈɡa.to/",example:"El gato duerme todo el día.",tag:"animals",level:"A1"},
];
const WORDS_BY_LANG: Record<string, typeof EN_WORDS> = { en: EN_WORDS, es: ES_WORDS };
// ─── LESSONS ──────────────────────────────────────────────────────────────────
const EN_LESSONS = [
  { id:"l1", title:"Привітання", emoji:"👋", level:"A1", wordIds:["a1_1","a1_2","a1_3","a1_4","a1_5","a1_6","a1_7","a1_8"], desc:"Перші слова та ввічливість", vibe:"Почни з нуля — і вже через 5 хвилин не соромитись сказати 'hello'" },
  { id:"l2", title:"Їжа та напої", emoji:"🍎", level:"A1", wordIds:["a1_9","a1_10","a1_11","a1_22","a1_40","a1_41"], desc:"Базова лексика для їжі", vibe:"Замовиш їжу без жестів — вже перемога" },
  { id:"l3", title:"Будинок та речі", emoji:"🏠", level:"A1", wordIds:["a1_12","a1_33","a1_34","a1_35","a1_36","a1_37","a1_29","a1_30"], desc:"Речі навколо тебе", vibe:"Твоя домашня лексика — основа всього" },
  { id:"l4", title:"Тварини та природа", emoji:"🐾", level:"A1", wordIds:["a1_14","a1_15","a1_60"], desc:"Природа навколо нас", vibe:"Навіть якщо ти в місті — ці слова скрізь" },
  { id:"l5", title:"Дії та рухи", emoji:"🏃", level:"A1", wordIds:["a1_38","a1_39","a1_42","a1_43","a1_44","a1_45","a1_46","a1_47"], desc:"Базові дієслова", vibe:"Дієслова — це серце мови. Без них — нікуди" },
  { id:"l6", title:"Кольори та прикметники", emoji:"🎨", level:"A1", wordIds:["a1_16","a1_17","a1_18","a1_19","a1_48","a1_49","a1_50","a1_51","a1_56","a1_57","a1_58"], desc:"Описуємо світ", vibe:"Сірий або яскравий — скажи як є" },
  { id:"l7", title:"Час та числа", emoji:"⏰", level:"A1", wordIds:["a1_20","a1_21","a1_27","a1_53","a1_54","a1_55"], desc:"Говоримо про час", vibe:"Час — гроші. Знай як його назвати" },
  { id:"l8", title:"Люди та сім'я", emoji:"👨‍👩‍👧", level:"A1", wordIds:["a1_24","a1_25","a1_26","a1_52"], desc:"Близькі люди", vibe:"Найважливіші слова — про людей навколо" },
  { id:"l9", title:"Подорожі: перші кроки", emoji:"✈️", level:"A2", wordIds:["a2_1","a2_2","a2_3","a2_13","a2_14","a2_30","a2_31"], desc:"Аеропорт та дорога", vibe:"Не загубишся в аеропорту — вже молодець" },
  { id:"l10", title:"Ресторан та кафе", emoji:"☕", level:"A2", wordIds:["a2_4","a2_5","a2_6","a2_7","a2_18","a2_59","a2_58","a2_57"], desc:"Замовляємо їжу", vibe:"Меню більше не страшне" },
  { id:"l11", title:"Емоції", emoji:"❤️", level:"A2", wordIds:["a1_52","a2_17","a2_18","a2_19","b1_8","b1_9","b1_10","b1_25","b1_57","b1_58"], desc:"Почуття та емоції", vibe:"Розкажи як тобі — без перекладача" },
  { id:"l12", title:"Здоров'я та тіло", emoji:"🏥", level:"A2", wordIds:["a2_15","a2_16","a2_44","a2_45","b1_24"], desc:"Медицина та здоров'я", vibe:"Краще знати ці слова і не використовувати" },
  { id:"l13", title:"Шопінг та гроші", emoji:"🛍️", level:"A2", wordIds:["a2_12","a2_32","a2_33","a2_34","a1_28","a2_47","a2_48"], desc:"Покупки та ціни", vibe:"Знижку попросиш самостійно" },
  { id:"l14", title:"Час та дати", emoji:"📅", level:"A2", wordIds:["a2_20","a2_21","a2_49","a2_50","a2_51","a2_52","a2_53","a2_54","a2_55"], desc:"Як часто? Як довго?", vibe:"Домовитись про зустріч — без проблем" },
  { id:"l15", title:"Бізнес базовий", emoji:"💼", level:"B1", wordIds:["b1_1","b1_2","b1_3","b1_4","b1_29","b1_30","b1_33","b1_34"], desc:"Ділова лексика", vibe:"Звучи як профі на першій зустрічі" },
  { id:"l16", title:"Кар'єра та офіс", emoji:"🏢", level:"B1", wordIds:["b1_11","b1_13","b1_14","b1_15","b1_16","b1_51","b1_52","b1_53","b1_54","b1_55"], desc:"Робота та кар'єра", vibe:"Від стажера до ліда — словниковий запас важить" },
  { id:"l17", title:"Сленг та розмова", emoji:"😎", level:"B1", wordIds:["b1_5","b1_6","b1_7","b2_10","b2_11","b2_12","b2_13"], desc:"Жива розмовна мова", vibe:"Говори як у TikTok, а не як у підручнику" },
  { id:"l18", title:"Технології", emoji:"💻", level:"B1", wordIds:["b1_26","b1_27","b1_28","b1_44","b1_45","b1_46","b1_47","b1_48","b1_49","b1_50"], desc:"Цифровий світ", vibe:"IT-лексика відкриває двері до міжнародної кар'єри" },
  { id:"l19", title:"Характер та особистість", emoji:"🌟", level:"B1", wordIds:["b1_36","b1_37","b1_38","b1_39","b1_40","b1_10","b1_8","b1_25"], desc:"Описуємо людей", vibe:"Компліменти та характеристики — живою мовою" },
  { id:"l20", title:"Природа та екологія", emoji:"🌿", level:"B1", wordIds:["b1_12","b1_41","b1_42","b1_43"], desc:"Навколишнє середовище", vibe:"Говорити про клімат — вже не лише для вчених" },
  { id:"l21", title:"Просунутий бізнес", emoji:"📊", level:"B2", wordIds:["b2_5","b2_18","b2_20","b2_21","b2_22","b2_23","b2_25","b1_31"], desc:"Переговори та стратегія", vibe:"Рівень 'звучиш як CEO'" },
  { id:"l22", title:"Просунуті прикметники", emoji:"🎨", level:"B2", wordIds:["b2_1","b2_2","b2_3","b2_4","b2_14","b2_28","b2_29","b2_30"], desc:"Точні та влучні описи", vibe:"Замість 'хороший' — десятки точних слів" },
  { id:"l23", title:"Психологія та розум", emoji:"🧠", level:"B2", wordIds:["b2_16","b2_17","b2_15","b2_8","b2_9","b2_26","b2_27","b1_9","b1_59","b1_60"], desc:"Внутрішній світ людини", vibe:"Психологія — мова 21 століття" },
  { id:"l24", title:"Академічна мова", emoji:"🎓", level:"C1", wordIds:["c1_4","c1_5","c1_7","c1_8","b2_7","c1_12","c1_13","c1_14","c1_15"], desc:"Наукова та академічна лексика", vibe:"Для тих хто пише есе або читає наукові статті" },
  { id:"l25", title:"Складні прикметники", emoji:"💎", level:"C1", wordIds:["c1_1","c1_2","c1_3","c1_6","c1_11"], desc:"Рідкісні та точні слова", vibe:"C1 — це коли кожне слово влучає в ціль" },
  { id:"l26", title:"Дієслова C1", emoji:"⚡", level:"C1", wordIds:["c1_9","c1_10","c1_12","c1_15","b2_5","b2_23"], desc:"Дієслова для досвідчених", vibe:"Коли 'зробити' вже не вистачає" },
];
const TAGS = [
  { id:"all", label:"Всі", emoji:"📚" },
  { id:"basics", label:"Основи", emoji:"💬" },
  { id:"food", label:"Їжа", emoji:"🍎" },
  { id:"travel", label:"Подорожі", emoji:"✈️" },
  { id:"slang", label:"Сленг", emoji:"😎" },
  { id:"business", label:"Бізнес", emoji:"💼" },
  { id:"tech", label:"Технології", emoji:"💻" },
  { id:"health", label:"Здоров'я", emoji:"🏥" },
  { id:"emotions", label:"Емоції", emoji:"❤️" },
  { id:"adjectives", label:"Прикметники", emoji:"✨" },
  { id:"people", label:"Люди", emoji:"👥" },
  { id:"time", label:"Час", emoji:"⏰" },
  { id:"custom", label:"Мої слова", emoji:"⭐" },
];
const GOALS = [
  { id:"travel", label:"Подорожі", emoji:"✈️", desc:"Впевнено подорожувати світом" },
  { id:"work", label:"Робота", emoji:"💼", desc:"Кар'єра та ділове спілкування" },
  { id:"study", label:"Навчання", emoji:"🎓", desc:"Університет або курси" },
  { id:"media", label:"Серіали", emoji:"🎬", desc:"Дивитися без субтитрів" },
  { id:"move", label:"Переїзд", emoji:"🏠", desc:"Жити за кордоном" },
  { id:"chat", label:"Спілкування", emoji:"💬", desc:"Друзі та соцмережі" },
];
const LEVELS = ["A1","A2","B1","B2","C1"];
const SCENARIOS = [
  { id:"coffee", emoji:"☕", label:"Замовити каву", prompt:"Навчи мене замовляти каву в англомовному кафе. Дай типові фрази і зроби зі мною рольову гру." },
  { id:"meet", emoji:"👋", label:"Знайомство", prompt:"Навчи мене знайомитися з людьми англійською. Дай фрази для small talk." },
  { id:"fight", emoji:"😤", label:"Сварка", prompt:"Навчи мене сперечатися та відстоювати думку англійською." },
  { id:"flirt", emoji:"😏", label:"Флірт", prompt:"Навчи мене фліртувати англійською. Компліменти, легкий флірт." },
  { id:"shop", emoji:"🛍️", label:"Шопінг", prompt:"Навчи мене робити покупки в англомовному магазині." },
  { id:"tiktok", emoji:"🎵", label:"TikTok сленг", prompt:"Поясни популярний сленг з TikTok: no cap, slay, understood the assignment." },
  { id:"doctor", emoji:"🏥", label:"У лікаря", prompt:"Навчи мене описувати симптоми лікарю англійською." },
  { id:"airport", emoji:"✈️", label:"Аеропорт", prompt:"Навчи мене всьому в аеропорту — check-in, митниця, gate." },
];
const TOXIC_MESSAGES: Record<string, string[]> = {
  noStreak: ["Ти взагалі вчишся? 😑", "Дні йдуть, а додаток пилиться... 🙃", "Навіть слимак рухається швидше.", "Серйозно? Знову пропустив?"],
  streak3: ["3 дні підряд? Окей, вже щось 🤏", "Непогано для початку.", "3 дні — це як прогріватись перед тренуванням."],
  streak7: ["Тиждень! Ти вже не безнадійний 😄", "7 днів підряд. Мама була б горда.", "Тиждень без зупинки!"],
  streak30: ["МІСЯЦЬ?! Ти монстр 🔥", "30 днів! Навіть Дуолінго-сова заплакала від заздрощів.", "Місяць підряд. Поважаю."],
  forgetting: ["Ей, ти МАЙЖЕ забув це слово 😏 Рятуй!", "Твій мозок вже готовий викинути це...", "Це слово тебе забуде першим."],
  weakWords: ["Ці слова тебе ненавидять. Взаємно? 😒", "Знову ті самі помилки. Класика.", "Слабкі слова = слабкі місця 💀"],
};
const getToxicMsg = (type: string) => { const m = TOXIC_MESSAGES[type]||["..."]; return m[Math.floor(Math.random()*m.length)]; };
const LANGUAGES = [
  { id:"en", name:"Англійська", flag:"🇺🇸", native:"English", speakLang:"en-US" },
  { id:"es", name:"Іспанська", flag:"🇪🇸", native:"Español", speakLang:"es-ES" },
];
// ─── UTILS ────────────────────────────────────────────────────────────────────
const SAVE_KEY = "lf_v5";
const loadData = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {}; } catch { return {}; } };
const saveData = (d: any) => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {} };
const shuf = <T,>(a: T[]): T[] => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
const speak = (text: string, lang="en-US", rate=0.85) => { if(!window.speechSynthesis) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang=lang; u.rate=rate; window.speechSynthesis.speak(u); };
const getDayKey = () => new Date().toISOString().split("T")[0];
const calcStreak = (history: string[]) => {
  if (!history || !history.length) return 0;
  const days = [...new Set(history)].sort().reverse();
  const today = getDayKey();
  const yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
  if (days[0]!==today && days[0]!==yesterday) return 0;
  let streak=1;
  for (let i=1;i<days.length;i++) { if((new Date(days[i-1]).getTime()-new Date(days[i]).getTime())/86400000===1) streak++; else break; }
  return streak;
};
const simulateAI = async (messages: any[], _: any, langName: string) => {
  return new Promise<string>(resolve => {
    setTimeout(() => {
      const lastMsg = messages[messages.length - 1].content.toLowerCase();
      if (lastMsg.includes("кава") || lastMsg.includes("каву")) {
        resolve(`Ось як замовити каву ${langName} як місцевий 😎:\n\n1. "Can I get a large cappuccino, please?"\n2. "I'll have an iced latte with oat milk."\n\nДавай зіграємо! Я бариста: "Hi! What can I get for you today?"`);
      } else if (lastMsg.includes("флірт") || lastMsg.includes("фліртувати")) {
        resolve(`Оу, пішла жара 😏 Ось пара фраз:\n\n1. "You have a great smile."\n2. "Are you free this weekend?"\n\nСпробуй сказати щось мені, побачимо чи спрацює!`);
      } else if (lastMsg.includes("tiktok") || lastMsg.includes("сленг")) {
        resolve(`Сленг з TikTok - це база! 📱\n\n• "Slay" - робити щось круто.\n• "No cap" - клянусь.\n• "It's giving..." - передає атмосферу.\n\nСпробуй скласти речення з "No cap"!`);
      } else if (lastMsg.includes("знайомство") || lastMsg.includes("знайомитися")) {
        resolve(`Small talk ${langName} — це просто!\n\nКажи так:\n1. "Hey, how's it going?"\n2. "Nice to meet you, I'm [Твоє ім'я]."\n\nЯ почну: "Hey! I don't think we've met. I'm Alex."`);
      } else {
        resolve(`Зрозумів тебе! Це чудове питання. У ${langName} є багато нюансів, але якщо сказати просто:\n\nВикористовуй слова, які ми вчили в уроках. Практика робить досконалим! ✨ Давай ще питання або вибери сценарій зверху.`);
      }
    }, 1500);
  });
};
// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function GlowBtn({ children, onClick, disabled, color="var(--green)", style={} }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn-press"
      style={{ background:disabled?"var(--bg4)":color, color:disabled?"var(--text3)":"#000", border:"none", borderRadius:16, padding:"15px 24px", fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:15, cursor:disabled?"default":"pointer", transition:"all .2s", boxShadow:disabled?"none":`0 0 20px ${color}55, 0 4px 0 ${color}88`, letterSpacing:.5, ...style }}>
      {children}
    </button>
  );
}
function ProgressBar({ value, max, color="var(--green)", h=8 }: any) {
  const pct = Math.min(100, Math.max(0, max>0?(value/max)*100:0));
  return (
    <div style={{ width:"100%", height:h, background:"var(--bg4)", borderRadius:h, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:h, transition:"width .4s cubic-bezier(.4,0,.2,1)" }}/>
    </div>
  );
}
function Tag({ tag, selected, onClick }: any) {
  const t = TAGS.find(t=>t.id===tag)||{label:tag,emoji:"🏷️"};
  return (
    <button onClick={onClick} style={{ background:selected?"var(--green)":"var(--bg3)", color:selected?"#000":"var(--text2)", border:`1px solid ${selected?"var(--green)":"var(--border)"}`, borderRadius:20, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap", flexShrink:0 }}>
      {t.emoji} {t.label}
    </button>
  );
}
function SRSBadge({ card }: any) {
  const level = SRS.getLevel(card);
  const config: any = { new:{label:"Нове",color:"var(--blue)"}, learning:{label:"Вивчаю",color:"var(--orange)"}, reviewing:{label:"Повторення",color:"var(--purple)"}, mastered:{label:"Засвоєно",color:"var(--green)"} }[level];
  return <span style={{ background:`${config.color}22`, color:config.color, border:`1px solid ${config.color}44`, borderRadius:8, padding:"2px 6px", fontSize:10, fontWeight:800 }}>{config.label}</span>;
}
function ToxicBanner({ streak, almostForgotten, weakCards }: any) {
  const [msg, setMsg] = useState<string|null>(null);
  const [type, setType] = useState("neutral");
  useEffect(() => {
    if (almostForgotten.length > 0) { setMsg(`⚡ "${almostForgotten[0].en}" — ${getToxicMsg("forgetting")}`); setType("warning"); }
    else if (streak >= 30) { setMsg(`🔥 ${streak} днів підряд! ${getToxicMsg("streak30")}`); setType("hype"); }
    else if (streak >= 7) { setMsg(`🔥 ${streak} днів підряд! ${getToxicMsg("streak7")}`); setType("hype"); }
    else if (streak >= 3) { setMsg(`🔥 ${streak} дні — ${getToxicMsg("streak3")}`); setType("ok"); }
    else if (streak === 0) { setMsg(getToxicMsg("noStreak")); setType("toxic"); }
    else if (weakCards.length > 0) { setMsg(getToxicMsg("weakWords")); setType("toxic"); }
  }, [streak, almostForgotten.length, weakCards.length]);
  if (!msg) return null;
  const colors: any = { toxic:{bg:"var(--red)11",border:"var(--red)33",text:"var(--red)"}, warning:{bg:"var(--orange)11",border:"var(--orange)33",text:"var(--orange)"}, hype:{bg:"var(--green)11",border:"var(--green)33",text:"var(--green)"}, ok:{bg:"var(--blue)11",border:"var(--blue)33",text:"var(--blue)"}, neutral:{bg:"var(--bg3)",border:"var(--border)",text:"var(--text2)"} }[type];
  return (
    <div style={{ background:colors.bg, border:`1px solid ${colors.border}`, borderRadius:14, padding:"11px 14px", marginBottom:14, animation:"toxicPulse 3s ease infinite" }}>
      <span style={{ color:colors.text, fontWeight:800, fontSize:13 }}>{msg}</span>
    </div>
  );
}
function FeedbackPanel({ correct, correctAnswer, onNext }: any) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:300, background:correct?"rgba(20,40,20,.98)":"rgba(40,15,15,.98)", borderTop:`3px solid ${correct?"var(--green)":"var(--red)"}`, padding:"16px 20px", paddingBottom:"calc(16px + var(--safe-bottom))", display:"flex", alignItems:"center", justifyContent:"space-between", animation:"slideUp .22s ease", backdropFilter:"blur(20px)" }}>
      <div>
        <div style={{ fontWeight:900, fontSize:18, color:correct?"var(--green)":"var(--red)", marginBottom:2 }}>{correct?"✓ Правильно!":"✗ Неправильно"}</div>
        {!correct && <div style={{ color:"var(--text2)", fontSize:13 }}>Правильно: <b style={{color:"var(--text1)"}}>{correctAnswer}</b></div>}
      </div>
      <button onClick={onNext} style={{ background:correct?"var(--green)":"var(--red)", color:"#000", border:"none", borderRadius:14, padding:"13px 22px", fontWeight:900, fontSize:14, cursor:"pointer" }}>
        ДАЛІ →
      </button>
    </div>
  );
}
function ExChoice({ card, speakLang, allCards, onAnswer }) {
  const [sel, setSel] = useState(null);
  const opts = useRef(null);

  if (!opts.current) {
    const d = shuf(allCards.filter((c) => c.id !== card.id))
      .slice(0, 3)
      .map((c) => c.uk);
    opts.current = shuf([card.uk, ...d]);
  }

  const pick = (opt) => {
    if (sel) return;
    setSel(opt);
    setTimeout(() => onAnswer(opt === card.uk, card.uk), 500);
  };

  return (
    <div style={{ animation: "popIn .3s ease", width: "100%" }}>
      <p style={{ color: "var(--text2)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
        Оберіть переклад
      </p>
      <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 20, padding: "22px 20px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "var(--text1)", marginBottom: 6 }}>{card.en}</div>
        <div style={{ color: "var(--text3)", fontSize: 13, fontFamily: "'Space Mono',monospace" }}>{card.transcription}</div>
        <button onClick={() => speak(card.en, speakLang)} style={{ marginTop: 12, background: "var(--blue)22", border: "1px solid var(--blue)44", color: "var(--blue)", borderRadius: 10, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          🔊 Вимова
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {opts.current.map(opt => {
          let bg = "var(--bg3)", border = "1px solid var(--border)", color = "var(--text1)";
          if (sel === opt) {
            bg = opt === card.uk ? "#16a34a33" : "#dc262633";
            border = `1px solid ${opt === card.uk ? "var(--green)" : "var(--red)"}`;
            color = opt === card.uk ? "var(--green)" : "var(--red)";
          }
          return (
            <button key={opt} onClick={() => pick(opt)} style={{ background: bg, border, color, borderRadius: 14, padding: "16px 10px", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all .15s", lineHeight: 1.3 }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function ExTypeAnswer({ card, speakLang, onAnswer }: any) {
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const check = () => { if(!val.trim()||submitted) return; setSubmitted(true); setTimeout(()=>onAnswer(val.trim().toLowerCase()===card.uk.toLowerCase(),card.uk),400); };
  return (
    <div style={{ animation:"popIn .3s ease", width:"100%" }}>
      <p style={{ color:"var(--text2)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Введіть переклад</p>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:20, padding:"22px 20px", marginBottom:20, textAlign:"center" }}>
        <div style={{ fontSize:36, fontWeight:900, marginBottom:6 }}>{card.en}</div>
        <div style={{ color:"var(--text3)", fontSize:13, fontFamily:"'Space Mono',monospace", marginBottom:10 }}>{card.transcription}</div>
        <div style={{ color:"var(--text2)", fontSize:13, fontStyle:"italic" }}>{card.example}</div>
        <button onClick={()=>speak(card.en,speakLang)} style={{ marginTop:12, background:"var(--blue)22", border:"1px solid var(--blue)44", color:"var(--blue)", borderRadius:10, padding:"7px 16px", cursor:"pointer", fontSize:13, fontWeight:700 }}>🔊 Вимова</button>
      </div>
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()} placeholder="Введіть українською..." style={{ width:"100%", padding:"16px 18px", fontSize:16, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:14, color:"var(--text1)", fontWeight:700, marginBottom:14 }}/>
      <GlowBtn onClick={check} disabled={!val.trim()} style={{ width:"100%", padding:"16px" }}>ПЕРЕВІРИТИ</GlowBtn>
    </div>
  );
}
function ExBuildWord({ card, onAnswer }: any) {
  const letters = useRef(shuf(card.uk.split("")));
  const [built, setBuilt] = useState<{letter:string,srcIdx:number}[]>([]);
  const [usedIdx, setUsedIdx] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const add = (l: string,i: number) => { if(submitted||usedIdx.includes(i)) return; setBuilt(b=>[...b,{letter:l,srcIdx:i}]); setUsedIdx(u=>[...u,i]); };
  const rem = (i: number) => { if(submitted) return; const item=built[i]; setUsedIdx(u=>u.filter(x=>x!==item.srcIdx)); setBuilt(b=>b.filter((_,x)=>x!==i)); };
  const check = () => { if(submitted||!built.length) return; setSubmitted(true); const a=built.map(b=>b.letter).join(""); setTimeout(()=>onAnswer(a===card.uk,card.uk),400); };
  return (
    <div style={{ animation:"popIn .3s ease", width:"100%" }}>
      <p style={{ color:"var(--text2)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Збери слово</p>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:18, padding:"18px", marginBottom:18, textAlign:"center" }}>
        <div style={{ fontSize:32, fontWeight:900 }}>{card.en}</div>
      </div>
      <div style={{ minHeight:54, background:"var(--bg4)", borderRadius:12, padding:"10px", display:"flex", flexWrap:"wrap", gap:6, marginBottom:16, alignItems:"center" }}>
        {!built.length && <span style={{ color:"var(--text3)", fontSize:13 }}>Натискай букви...</span>}
        {built.map((b,i)=><button key={i} onClick={()=>rem(i)} style={{ background:"var(--green)", color:"#000", border:"none", borderRadius:8, width:34, height:34, fontWeight:900, fontSize:15, cursor:"pointer" }}>{b.letter}</button>)}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:18, justifyContent:"center" }}>
        {letters.current.map((l,i)=><button key={i} onClick={()=>add(l,i)} disabled={usedIdx.includes(i)} style={{ background:usedIdx.includes(i)?"var(--bg4)":"var(--bg3)", color:usedIdx.includes(i)?"var(--text3)":"var(--text1)", border:`1px solid ${usedIdx.includes(i)?"var(--border)":"var(--border2)"}`, borderRadius:8, width:36, height:36, fontWeight:800, fontSize:15, cursor:usedIdx.includes(i)?"default":"pointer", transition:"all .1s" }}>{l}</button>)}
      </div>
      <GlowBtn onClick={check} disabled={!built.length} style={{ width:"100%", padding:"16px" }}>ПЕРЕВІРИТИ</GlowBtn>
    </div>
  );
}
function ExMatching({ cards, onComplete }: any) {
  const pairs = useRef(cards.slice(0,5));
  const lefts = useRef(shuf(pairs.current.map((c:any)=>c.en)));
  const rights = useRef(shuf(pairs.current.map((c:any)=>c.uk)));
  const [selL, setSelL] = useState<string|null>(null);
  const [selR, setSelR] = useState<string|null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  useEffect(() => {
    if (selL && selR) {
      const pair = pairs.current.find((c:any)=>c.en===selL);
      if (pair && pair.uk===selR) { setMatched(m=>[...m,selL]); setSelL(null); setSelR(null); if(matched.length+1===pairs.current.length) setTimeout(()=>onComplete(true),600); }
      else { setWrong([selL,selR]); setTimeout(()=>{setSelL(null);setSelR(null);setWrong([]);},800); }
    }
  },[selL,selR]);
  const btnStyle = (word: string, side: string) => {
    const isMatched = side==="l"?matched.includes(word):matched.some(m=>pairs.current.find((p:any)=>p.en===m)?.uk===word);
    const isWrong = wrong.includes(word);
    const isSel = side==="l"?selL===word:selR===word;
    return { background:isMatched?"var(--green)22":isWrong?"var(--red)22":isSel?"var(--blue)22":"var(--bg3)", color:isMatched?"var(--green)":isWrong?"var(--red)":isSel?"var(--blue)":"var(--text1)", border:`1px solid ${isMatched?"var(--green)":isWrong?"var(--red)":isSel?"var(--blue)":"var(--border)"}`, borderRadius:12, padding:"11px 8px", fontWeight:800, fontSize:13, cursor:isMatched?"default":"pointer", transition:"all .15s", width:"100%", opacity:isMatched?.5:1 };
  };
  return (
    <div style={{ animation:"popIn .3s ease", width:"100%" }}>
      <p style={{ color:"var(--text2)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Знайди пару</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{lefts.current.map((w:string)=><button key={w} onClick={()=>!matched.includes(w)&&setSelL(w)} style={btnStyle(w,"l")}>{w}</button>)}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{rights.current.map((w:string)=>{const iM=matched.some(m=>pairs.current.find((p:any)=>p.en===m)?.uk===w);return <button key={w} onClick={()=>!iM&&setSelR(w)} style={btnStyle(w,"r")}>{w}</button>;})}</div>
      </div>
    </div>
  );
}
function ExFillGap({ card, onAnswer }: any) {
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const gapped = card.example.replace(new RegExp(card.en,'i'),'___');
  const check = () => { if(!val.trim()||submitted) return; setSubmitted(true); setTimeout(()=>onAnswer(val.trim().toLowerCase()===card.en.toLowerCase(),card.en),400); };
  return (
    <div style={{ animation:"popIn .3s ease", width:"100%" }}>
      <p style={{ color:"var(--text2)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Заповни пропуск</p>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:18, padding:"20px", marginBottom:18, textAlign:"center" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"var(--text2)", marginBottom:10 }}>Переклад: <span style={{color:"var(--text1)"}}>{card.uk}</span></div>
        <div style={{ fontSize:18, fontWeight:800, lineHeight:1.6 }}>{gapped}</div>
      </div>
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()} placeholder="Введіть слово..." style={{ width:"100%", padding:"16px 18px", fontSize:16, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:14, color:"var(--text1)", fontWeight:700, marginBottom:14 }}/>
      <GlowBtn onClick={check} disabled={!val.trim()} style={{ width:"100%", padding:"16px" }}>ПЕРЕВІРИТИ</GlowBtn>
    </div>
  );
}
function ExDictation({ card, speakLang, onAnswer }: any) {
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [played, setPlayed] = useState(false);
  const play = () => { speak(card.en,speakLang,0.7); setPlayed(true); };
  const check = () => { if(!val.trim()||submitted||!played) return; setSubmitted(true); setTimeout(()=>onAnswer(val.trim().toLowerCase()===card.en.toLowerCase(),card.en),400); };
  return (
    <div style={{ animation:"popIn .3s ease", width:"100%" }}>
      <p style={{ color:"var(--text2)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Диктант</p>
      <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:18, padding:"28px 20px", marginBottom:20, textAlign:"center" }}>
        <p style={{ color:"var(--text2)", fontSize:14, marginBottom:18 }}>Послухайте та напишіть слово</p>
        <button onClick={play} style={{ background:"var(--blue)", border:"none", borderRadius:14, padding:"14px 28px", color:"#000", fontWeight:900, fontSize:15, cursor:"pointer" }}>{played?"🔊 Ще раз":"▶ Відтворити"}</button>
        {played && <div style={{ marginTop:14, color:"var(--text3)", fontSize:13 }}>Переклад: {card.uk}</div>}
      </div>
      <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&check()} placeholder="Введіть слово..." disabled={!played} style={{ width:"100%", padding:"16px 18px", fontSize:16, background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:14, color:"var(--text1)", fontWeight:700, marginBottom:14, opacity:played?1:.5 }}/>
      <GlowBtn onClick={check} disabled={!val.trim()||!played} style={{ width:"100%", padding:"16px" }}>ПЕРЕВІРИТИ</GlowBtn>
    </div>
  );
}
// ─── SESSION SCREEN ───────────────────────────────────────────────────────────
function SessionScreen({ cards, mode, speakLang, allCards, onFinish, onExit }: any) {
  const [idx, setIdx] = useState(0);
  const [fb, setFb] = useState<any>(null);
  const [shake, setShake] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const sessionCards = useRef<any[]|null>(null);
  if (!sessionCards.current) {
    const due = shuf(cards.filter((c:any)=>SRS.isDue(c))).slice(0,10);
    sessionCards.current = due.length > 0 ? due : shuf(cards).slice(0,8);
  }
  const current = sessionCards.current[idx];
  const total = sessionCards.current.length;
  const handleAnswer = (correct: boolean, correctAnswer: string) => {
    if (!correct) { setShake(true); setTimeout(()=>setShake(false),500); }
    setFb({ correct, correctAnswer });
  };
  const handleNext = () => {
    const correct = fb.correct;
    const quality = correct ? 4 : 1;
    const updated = SRS.nextReview(current, quality);
    setResults(r=>[...r,{card:current,srs:updated,correct}]);
    if (correct) setXpEarned(x=>x+10);
    setFb(null);
    if (idx+1>=total) setDone(true);
    else setIdx(i=>i+1);
  };
  const handleMatchComplete = () => { setXpEarned(x=>x+40); setDone(true); };
  if (done) {
    const correct = results.filter(r=>r.correct).length;
    const accuracy = results.length>0 ? Math.round((correct/results.length)*100) : 100;
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        <style>{GLOBAL_CSS}</style>
        {Array.from({length:20}).map((_,i)=>(
          <div key={i} style={{ position:"absolute", bottom:"25%", left:`${5+Math.random()*90}%`, width:10, height:10, background:["var(--green)","var(--blue)","var(--purple)","var(--orange)","var(--yellow)"][i%5], borderRadius:3, animation:`confetti ${1+Math.random()*.8}s ${Math.random()*.4}s ease-out forwards` }}/>
        ))}
        <div style={{ textAlign:"center", padding:"24px 20px", animation:"popIn .5s ease", maxWidth:380, width:"100%" }}>
          <div style={{ fontSize:64, marginBottom:14 }}>🏆</div>
          <h1 style={{ fontWeight:900, fontSize:28, color:"var(--green)", marginBottom:6 }}>Сесію завершено!</h1>
          <p style={{ color:"var(--text2)", fontSize:14, marginBottom:28 }}>{results.length} карток • {accuracy}% точність</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:26 }}>
            {[{emoji:"⭐",value:`+${xpEarned}`,label:"XP",color:"var(--yellow)"},{emoji:"✅",value:`${correct}/${results.length}`,label:"Правильно",color:"var(--green)"},{emoji:"🎯",value:`${accuracy}%`,label:"Точність",color:"var(--blue)"}].map(s=>(
              <div key={s.label} style={{ background:"var(--bg3)", borderRadius:14, padding:"14px 6px", border:"1px solid var(--border)" }}>
                <div style={{ fontSize:20 }}>{s.emoji}</div>
                <div style={{ fontWeight:900, fontSize:18, color:s.color }}>{s.value}</div>
                <div style={{ fontWeight:700, fontSize:10, color:"var(--text3)", textTransform:"uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <GlowBtn onClick={()=>onFinish(results,xpEarned)} style={{ width:"100%", padding:"16px", fontSize:15 }}>ПРОДОВЖИТИ</GlowBtn>
        </div>
      </div>
    );
  }
  if (mode==="matching") {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ padding:"16px 20px", paddingTop:"calc(16px + var(--safe-top))", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid var(--border)" }}>
          <button onClick={onExit} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:20, cursor:"pointer", padding:"4px 8px" }}>✕</button>
          <span style={{ fontWeight:800, fontSize:14, color:"var(--text2)" }}>Знайди пару</span>
        </div>
        <div style={{ flex:1, padding:"20px 16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth:480 }}>
            <ExMatching cards={sessionCards.current} onComplete={handleMatchComplete}/>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ padding:"14px 16px", paddingTop:"calc(14px + var(--safe-top))", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--border)" }}>
        <button onClick={onExit} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:20, cursor:"pointer", padding:"4px 8px", flexShrink:0 }}>✕</button>
        <div style={{ flex:1 }}><ProgressBar value={idx} max={total} h={8}/></div>
        <span style={{ fontWeight:700, fontSize:12, color:"var(--text3)", flexShrink:0 }}>{idx+1}/{total}</span>
      </div>
      <div style={{ flex:1, padding:"20px 16px 140px", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", overflowY:"auto" }}>
        <div key={idx} style={{ width:"100%", maxWidth:480, animation:shake?"shake .4s ease":"none" }}>
          {mode==="choice"    && <ExChoice card={current} speakLang={speakLang} allCards={allCards} onAnswer={handleAnswer}/>}
          {mode==="type"      && <ExTypeAnswer card={current} speakLang={speakLang} onAnswer={handleAnswer}/>}
          {mode==="build"     && <ExBuildWord card={current} onAnswer={handleAnswer}/>}
          {mode==="fill"      && <ExFillGap card={current} onAnswer={handleAnswer}/>}
          {mode==="dictation" && <ExDictation card={current} speakLang={speakLang} onAnswer={handleAnswer}/>}
        </div>
      </div>
      {fb && <FeedbackPanel correct={fb.correct} correctAnswer={fb.correctAnswer} onNext={handleNext}/>}
    </div>
  );
}
// ─── LESSONS TAB ──────────────────────────────────────────────────────────────
function LessonsTab({ cards, level, langId, onStartLesson, onStartCustomLesson }: any) {
  const levelOrder = ["A1","A2","B1","B2","C1"];
  const userLevelIdx = levelOrder.indexOf(level);
  const lessons = EN_LESSONS;
  const getLessonProgress = (lesson: any) => {
    const wordIds = lesson.wordIds;
    const learned = wordIds.filter((id: string) => {
      const card = cards.find((c:any)=>c.id===id);
      return card && (card.srs?.repetitions||0) >= 1;
    }).length;
    return { learned, total: wordIds.length };
  };
  const isUnlocked = (lesson: any) => {
    const lessonLevelIdx = levelOrder.indexOf(lesson.level);
    return lessonLevelIdx <= userLevelIdx + 1;
  };
  const levelEmojis: any = { A1:"🌱", A2:"🌿", B1:"🌳", B2:"🔥", C1:"💎" };
  const levelDescs: any = {
    A1:"Починаємо з нуля. Перші слова — перші перемоги.",
    A2:"Ти вже не новачок. Розширюємо горизонти.",
    B1:"Середній рівень — тут починається справжня мова.",
    B2:"Просунутий. Говориш майже як носій.",
    C1:"Майстер. Тільки найскладніше."
  };
  const customCards = cards.filter((c:any)=>c.id.startsWith("cust_"));
  return (
    <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
      <h2 style={{ fontWeight:900, fontSize:22, marginBottom:2 }}>📚 Уроки</h2>
      <p style={{ color:"var(--text2)", fontSize:13, marginBottom:20 }}>Крок за кроком до вільної мови</p>
      {customCards.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ background:"var(--yellow)", color:"#000", borderRadius:8, padding:"3px 10px", fontWeight:900, fontSize:12 }}>⭐ МОЇ СЛОВА</div>
            <div style={{ flex:1, height:1, background:"var(--border)" }}/>
          </div>
          <button onClick={()=>onStartCustomLesson(customCards)} style={{ width:"100%", background:"var(--yellow)11", border:"1px solid var(--yellow)44", borderRadius:16, padding:"14px 16px", textAlign:"left", cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:26 }}>⭐</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:15, color:"var(--yellow)", marginBottom:1 }}>Мої слова</div>
                <div style={{ color:"var(--text3)", fontSize:11 }}>Слова які ти додав сам • {customCards.length} слів</div>
              </div>
            </div>
          </button>
        </div>
      )}
      {levelOrder.map(lvl => {
        const lvlLessons = lessons.filter((l:any)=>l.level===lvl);
        if (lvlLessons.length === 0) return null;
        const lvlIdx = levelOrder.indexOf(lvl);
        const isLvlUnlocked = lvlIdx <= userLevelIdx + 1;
        const totalLvlLearned = lvlLessons.reduce((acc:number,l:any)=>{ const {learned} = getLessonProgress(l); return acc+learned; },0);
        const totalLvlWords = lvlLessons.reduce((acc:number,l:any)=>acc+l.wordIds.length,0);
        return (
          <div key={lvl} style={{ marginBottom:24 }}>
            <div style={{ background:isLvlUnlocked?"var(--bg3)":"var(--bg2)", border:`1px solid ${isLvlUnlocked?"var(--border2)":"var(--border)"}`, borderRadius:14, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:isLvlUnlocked?6:0 }}>
                <span style={{ fontSize:20 }}>{isLvlUnlocked?levelEmojis[lvl]:"🔒"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontWeight:900, fontSize:14, color:isLvlUnlocked?"var(--text1)":"var(--text3)" }}>Рівень {lvl}</span>
                    {isLvlUnlocked && <span style={{ background:"var(--purple)22", color:"var(--purple)", border:"1px solid var(--purple)44", borderRadius:6, padding:"1px 6px", fontSize:10, fontWeight:800 }}>{totalLvlLearned}/{totalLvlWords}</span>}
                  </div>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:1 }}>{levelDescs[lvl]}</div>
                </div>
                {!isLvlUnlocked && <span style={{ fontSize:16 }}>🔒</span>}
              </div>
              {isLvlUnlocked && <ProgressBar value={totalLvlLearned} max={totalLvlWords} color="var(--purple)" h={4}/>}
            </div>
            {isLvlUnlocked && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, paddingLeft:6 }}>
                {lvlLessons.map((lesson:any) => {
                  const { learned, total } = getLessonProgress(lesson);
                  const pct = Math.round((learned/total)*100);
                  const unlocked = isUnlocked(lesson);
                  const completed = learned === total && total > 0;
                  const inProgress = learned > 0 && !completed;
                  return (
                    <button key={lesson.id} onClick={()=>unlocked&&onStartLesson(lesson)} disabled={!unlocked}
                      style={{ background:completed?"var(--green)11":inProgress?"var(--blue)11":"var(--bg3)", border:`2px solid ${completed?"var(--green)44":inProgress?"var(--blue)44":unlocked?"var(--border)":"var(--bg4)"}`, borderRadius:16, padding:"14px", textAlign:"left", cursor:unlocked?"pointer":"default", transition:"all .2s", opacity:unlocked?1:.4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:completed||inProgress?8:0 }}>
                        <div style={{ width:40, height:40, borderRadius:"50%", background:completed?"var(--green)":inProgress?"var(--blue)":"var(--bg4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, border:`2px solid ${completed?"var(--green)":inProgress?"var(--blue)":"var(--border)"}`, boxShadow:completed?`0 0 10px var(--green-glow)`:inProgress?`0 0 10px rgba(56,189,248,0.3)`:"none" }}>
                          {unlocked ? (completed?"✓":lesson.emoji) : "🔒"}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:1 }}>
                            <span style={{ fontWeight:900, fontSize:14, color:completed?"var(--green)":inProgress?"var(--blue)":"var(--text1)" }}>{lesson.title}</span>
                            {completed && <span style={{ fontSize:12 }}>⭐</span>}
                          </div>
                          <div style={{ color:"var(--text3)", fontSize:11 }}>{lesson.desc} · {total} слів</div>
                        </div>
                        <div style={{ fontWeight:900, fontSize:12, color:completed?"var(--green)":inProgress?"var(--blue)":"var(--text3)", flexShrink:0 }}>{pct}%</div>
                      </div>
                      {unlocked && !completed && <div style={{ fontSize:11, color:"var(--text3)", fontStyle:"italic", paddingLeft:50 }}>"{lesson.vibe}"</div>}
                      {(completed || inProgress) && <div style={{ paddingLeft:50 }}><ProgressBar value={learned} max={total} color={completed?"var(--green)":"var(--blue)"} h={4}/></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
// ─── AI CHAT ──────────────────────────────────────────────────────────────────
function AIChatScreen({ userName, langName, level, cards }: any) {
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:`Привіт, ${userName||"студенте"}! 👋 Я твій AI-вчитель ${langName||"англійської"}.\n\nМожу пояснити будь-яке слово простою мовою, розібрати живі фрази або зіграти рольову гру.\n\nВибери сценарій або пиши що хочеш 👇`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  const send = async (text: string) => {
    if (!text.trim()||loading) return;
    const userMsg = {role:"user",content:text};
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const reply = await simulateAI([...messages, userMsg], "", langName);
    setMessages(prev=>[...prev,{role:"assistant",content:reply}]);
    setLoading(false);
  };
  const quickPrompts = ["Поясни як для дебіла 😄","Дай приклад з фільму","Зробимо рольову гру","Як це в реальному житті?"];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>
      {messages.length<=1 && (
        <div style={{ padding:"0 16px 10px", overflowX:"auto" }}>
          <div className="scroll-x" style={{ display:"flex", gap:8, paddingBottom:4 }}>
            {SCENARIOS.map(s=>(
              <button key={s.id} onClick={()=>send(s.prompt)} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:12, padding:"9px 13px", whiteSpace:"nowrap", cursor:"pointer", fontWeight:800, fontSize:12, color:"var(--text1)", flexShrink:0 }}>{s.emoji} {s.label}</button>
            ))}
          </div>
        </div>
      )}
      <div className="scroll-y" style={{ flex:1, padding:"0 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.map((m,i)=>(
          <div key={i} className="chat-msg" style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,var(--purple),var(--blue))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, marginRight:6, flexShrink:0, marginTop:4 }}>🤖</div>}
            <div style={{ background:m.role==="user"?"var(--green)":"var(--bg3)", color:m.role==="user"?"#000":"var(--text1)", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"11px 14px", maxWidth:"82%", fontWeight:m.role==="user"?800:600, fontSize:13, lineHeight:1.6, border:m.role==="assistant"?"1px solid var(--border)":"none", whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,var(--purple),var(--blue))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🤖</div>
            <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"16px 16px 16px 4px", padding:"12px 16px" }}>
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      {!loading && messages.length>1 && (
        <div className="scroll-x" style={{ padding:"6px 16px" }}>
          <div style={{ display:"flex", gap:6 }}>
            {quickPrompts.map(p=><button key={p} onClick={()=>send(p)} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:16, padding:"5px 12px", whiteSpace:"nowrap", cursor:"pointer", fontWeight:700, fontSize:11, color:"var(--text2)", flexShrink:0 }}>{p}</button>)}
          </div>
        </div>
      )}
      <div style={{ padding:"10px 16px", paddingBottom:"calc(10px + var(--safe-bottom))", borderTop:"1px solid var(--border)", display:"flex", gap:8, background:"var(--bg2)" }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder="Запитай щось..." style={{ flex:1, padding:"13px 16px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, color:"var(--text1)", fontSize:14, fontWeight:700 }}/>
        <button onClick={()=>send(input)} disabled={!input.trim()||loading} style={{ background:!input.trim()||loading?"var(--bg4)":"var(--green)", border:"none", borderRadius:12, width:46, cursor:!input.trim()||loading?"default":"pointer", fontSize:18, transition:"all .2s", color:!input.trim()||loading?"var(--text3)":"#000", flexShrink:0 }}>↑</button>
      </div>
    </div>
  );
}
// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [user, setUser]     = useState<any>(null);
  const [lang, setLang]     = useState<any>(null);
  const [goal, setGoal]     = useState<any>(null);
  const [level, setLevel]   = useState("A1");
  const [cards, setCards]   = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [xp, setXp]         = useState(0);
  const [totalStats, setTotal] = useState({sessions:0,correct:0,total:0,minutes:0});
  const [activeMode, setActiveMode] = useState<string|null>(null);
  const [sessionStart, setSessionStart] = useState<number|null>(null);
  const [form, setForm]     = useState({name:"",email:"",password:""});
  const [dictSearch, setDictSearch] = useState("");
  const [dictTag, setDictTag]   = useState("all");
  const [addWord, setAddWord]   = useState({en:"",uk:"",example:"",tag:"custom",transcription:""});
  const [addLoading, setAddLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string|null>(null);
  const [customSessionCards, setCustomSessionCards] = useState<any[]|null>(null);
  const handleAuth = async (isRegister: boolean) => {
    if (!form.email.trim() || !form.password.trim()) return;
    try {
      const res = await fetch(`${API_URL}${isRegister?'/auth/register':'/auth/login'}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:form.email,password:form.password})
      });
      const data = await res.json();
      if (res.ok) {
        setUser({name:form.name||form.email.split("@")[0],email:form.email});
        setLang(data.lang||null); setGoal(data.goal||null); setLevel(data.level||"A1");
        setXp(data.xp||0); setHistory(data.history||[]); setTotal(data.totalStats||{sessions:0,correct:0,total:0,minutes:0});
        fetchWordsFromBackend(data.lang?.id||"en");
        setScreen(data.lang?"home":"pick_lang");
      } else { alert(data.message||"Помилка авторизації"); }
    } catch {
      setUser({name:form.name||form.email.split("@")[0],email:form.email});
      setCards(EN_WORDS);
      setScreen(loadData().lang?"home":"pick_lang");
    }
  };
  const fetchWordsFromBackend = async (languageId: string) => {
    try {
      const res = await fetch(`${API_URL}/words`);
      const dbWords = await res.json();
      const myDbWords = dbWords.filter((w:any)=>w.category===languageId||!w.category);
      const formattedDbWords = myDbWords.map((w:any)=>({id:`cust_${w.id}`,dbId:w.id,en:w.original,uk:w.translation,example:"Додано зі словника",tag:"custom",level:"custom",transcription:""}));
      const langWords = WORDS_BY_LANG[languageId]||EN_WORDS;
      const savedProgress = loadData().cards||[];
      const mergeWithProgress = (arr:any[]) => arr.map(w=>{ const sc=savedProgress.find((c:any)=>c.id===w.id); return sc?{...w,...sc,srs:sc.srs}:w; });
      setCards([...mergeWithProgress(langWords),...mergeWithProgress(formattedDbWords)]);
    } catch {
      const langWords = WORDS_BY_LANG[languageId]||EN_WORDS;
      const saved = loadData().cards||[];
      const merged = langWords.map((w:any)=>{ const sc=saved.find((c:any)=>c.id===w.id); return sc?{...w,...sc,srs:sc.srs}:w; });
      setCards([...merged,...saved.filter((c:any)=>c.id.startsWith("cust_"))]);
    }
  };
  useEffect(()=>{
    const s=loadData();
    if(s.user&&s.lang){
      setUser(s.user);setLang(s.lang);setGoal(s.goal);setLevel(s.level||"A1");
      setHistory(s.history||[]);setXp(s.xp||0);
      setTotal(s.totalStats||{sessions:0,correct:0,total:0,minutes:0});
      setScreen("home");
      fetchWordsFromBackend(s.lang.id);
    }
  },[]);
  useEffect(()=>{
    if(user&&user.email){
      fetch(`${API_URL}/users/${user.email}/sync`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang,goal,level,xp,history,totalStats})}).catch(()=>{});
      saveData({user,lang,goal,level,cards,history,xp,totalStats});
    }
  },[user,lang,goal,level,history,xp,totalStats]);
  useEffect(()=>{
    if(user&&user.email&&cards.length>0){
      const learned=cards.filter((c:any)=>c.srs);
      fetch(`${API_URL}/users/${user.email}/cards`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(learned)}).catch(()=>{});
      saveData({user,lang,goal,level,cards,history,xp,totalStats});
    }
  },[cards]);
  const streak = calcStreak(history);
  const dueCount = SRS.getDueCards(cards).length;
  const weakCards = cards.filter((c:any)=>(c.srs?.lapses||0)>=2);
  const almostForgotten = SRS.getAlmostForgotten(cards);
  const getLevelCards = () => {
    const levelOrder = ["A1","A2","B1","B2","C1"];
    const userLevelIdx = levelOrder.indexOf(level);
    return cards.filter((c:any)=>{ if(!c.level||c.level==="custom") return true; const idx=levelOrder.indexOf(c.level); return idx<=userLevelIdx+1; });
  };
  const handleSessionFinish = (results: any[], xpEarned: number) => {
    const today = getDayKey();
    setHistory(h=>[...new Set([...h,today])]);
    setXp(x=>x+xpEarned);
    setCards(prev=>{ const next=[...prev]; results.forEach(r=>{const i=next.findIndex((c:any)=>c.id===r.card.id);if(i>=0)next[i]={...next[i],srs:r.srs};}); return next; });
    const mins=Math.round((Date.now()-(sessionStart||Date.now()))/60000);
    setTotal(t=>({sessions:t.sessions+1,correct:t.correct+results.filter(r=>r.correct).length,total:t.total+results.length,minutes:t.minutes+Math.max(1,mins)}));
    setActiveMode(null);setActiveLessonId(null);setCustomSessionCards(null);setScreen("home");
  };
  const startMode = (mode: string, lessonId: string|null=null) => {
    setActiveMode(mode);setActiveLessonId(lessonId);setSessionStart(Date.now());setScreen("session");
  };
  const startLesson = (lesson: any) => {
    setActiveMode("lesson_"+lesson.id);setActiveLessonId(lesson.id);setSessionStart(Date.now());setScreen("session");
  };
  const startCustomLesson = (customCards: any[]) => {
    setCustomSessionCards(customCards);setActiveMode("custom_lesson");setSessionStart(Date.now());setScreen("session");
  };
  const addCustomWord = async () => {
    if (!addWord.en.trim()||!addWord.uk.trim()) return;
    setAddLoading(true);
    let transcription = addWord.transcription;
    if (!transcription) {
      try { const r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(addWord.en)}`); const d=await r.json(); transcription=d[0]?.phonetics?.find((p:any)=>p.text)?.text||""; } catch {}
    }
    try {
      const res=await fetch(`${API_URL}/words`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({original:addWord.en.trim(),translation:addWord.uk.trim(),category:lang?.id||'en'})});
      if(res.ok){const saved=await res.json();const nc={id:`cust_${saved.id}`,dbId:saved.id,en:addWord.en.trim(),uk:addWord.uk.trim(),example:addWord.example.trim()||`${addWord.en} is an important word.`,tag:addWord.tag,transcription:transcription||"",level:"custom"};setCards(c=>[...c,nc]);}
      else throw new Error();
    } catch { const nc={id:"cust_"+Date.now(),en:addWord.en.trim(),uk:addWord.uk.trim(),example:addWord.example.trim()||`${addWord.en} is an important word.`,tag:addWord.tag,transcription:transcription||"",level:"custom"};setCards(c=>[...c,nc]); }
    setAddWord({en:"",uk:"",example:"",tag:"custom",transcription:""});setAddLoading(false);setShowAddForm(false);
  };
  const deleteCard = async (id: string) => {
    const card=cards.find((c:any)=>c.id===id);
    if(card&&card.id.startsWith('cust_')){const dbId=card.dbId||id.replace('cust_','');try{await fetch(`${API_URL}/words/${dbId}`,{method:'DELETE'});}catch{}}
    setCards(c=>c.filter((c:any)=>c.id!==id));
  };
  // SESSION ROUTER
  if (screen==="session"&&activeMode) {
    let sessionCards: any[];
    if (activeMode==="custom_lesson"&&customSessionCards) { sessionCards=customSessionCards; }
    else if (activeLessonId) { const lesson=EN_LESSONS.find(l=>"lesson_"+l.id===activeMode); sessionCards=lesson?lesson.wordIds.map(id=>cards.find((c:any)=>c.id===id)).filter(Boolean):getLevelCards(); }
    else { sessionCards=getLevelCards(); }
    const sessionMode=activeMode.startsWith("lesson_")||activeMode==="custom_lesson"?"choice":activeMode;
    return <SessionScreen cards={sessionCards} mode={sessionMode} speakLang={lang?.speakLang||"en-US"} allCards={cards} onFinish={handleSessionFinish} onExit={()=>{setActiveMode(null);setActiveLessonId(null);setCustomSessionCards(null);setScreen("home");}}/>;
  }
  // ── WELCOME ──
  if (screen==="welcome") return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ textAlign:"center", maxWidth:340, width:"100%", animation:"fadeUp .6s ease" }}>
        <div style={{ fontSize:64, marginBottom:14 }}>🦜</div>
        <h1 style={{ fontWeight:900, fontSize:38, color:"var(--green)", letterSpacing:-1, marginBottom:6 }}>LinguaFlow</h1>
        <p style={{ color:"var(--text2)", fontSize:15, fontWeight:600, marginBottom:36 }}>Вчи мови так, як мозок<br/>запам'ятовує назавжди</p>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <GlowBtn onClick={()=>setScreen("register")} style={{ padding:"17px", fontSize:15, width:"100%" }}>🚀 Почати вчитися</GlowBtn>
          <button onClick={()=>setScreen("login")} style={{ background:"var(--bg3)", color:"var(--text2)", border:"1px solid var(--border)", borderRadius:16, padding:"15px", fontWeight:800, fontSize:14, cursor:"pointer" }}>Вже маю акаунт</button>
        </div>
      </div>
    </div>
  );
  // ── REGISTER / LOGIN ──
  if (screen==="register"||screen==="login") {
    const isReg = screen==="register";
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:22, padding:"28px 20px", width:"100%", maxWidth:360, animation:"popIn .4s ease" }}>
          <h2 style={{ fontWeight:900, fontSize:22, marginBottom:24, textAlign:"center" }}>{isReg?"Новий акаунт":"Увійти"}</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
            {isReg&&<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ваше ім'я" style={{ padding:"14px 16px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, color:"var(--text1)", fontSize:14, fontWeight:700, width:"100%" }}/>}
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" style={{ padding:"14px 16px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, color:"var(--text1)", fontSize:14, fontWeight:700, width:"100%" }}/>
            <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&handleAuth(isReg)} placeholder="Пароль" style={{ padding:"14px 16px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, color:"var(--text1)", fontSize:14, fontWeight:700, width:"100%" }}/>
          </div>
          <GlowBtn onClick={()=>handleAuth(isReg)} style={{ width:"100%", padding:"15px", fontSize:14 }}>{isReg?"Зареєструватись":"Увійти"}</GlowBtn>
          <button onClick={()=>setScreen(isReg?"login":"register")} style={{ background:"none", border:"none", color:"var(--text3)", fontWeight:700, width:"100%", marginTop:12, cursor:"pointer", fontSize:13 }}>
            {isReg?"Вже є акаунт? Увійти":"Немає акаунту? Реєстрація"}
          </button>
          <button onClick={()=>setScreen("welcome")} style={{ background:"none", border:"none", color:"var(--text3)", fontWeight:700, width:"100%", marginTop:4, cursor:"pointer", fontSize:13 }}>← Назад</button>
        </div>
      </div>
    );
  }
  // ── PICK LANGUAGE ──
  if (screen==="pick_lang") return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:380, width:"100%", animation:"fadeUp .5s ease" }}>
        <h2 style={{ fontWeight:900, fontSize:26, marginBottom:4 }}>Яку мову вчиш? 🌍</h2>
        <p style={{ color:"var(--text2)", marginBottom:24, fontSize:14 }}>Обери мову для навчання</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {LANGUAGES.map(l=>(
            <button key={l.id} onClick={()=>{ setLang(l); fetchWordsFromBackend(l.id); setScreen("pick_goal"); }} style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 18px", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:16, cursor:"pointer", textAlign:"left", transition:"all .2s" }}>
              <span style={{ fontSize:32 }}>{l.flag}</span>
              <div>
                <div style={{ fontWeight:900, fontSize:16, color:"var(--text1)" }}>{l.name}</div>
                <div style={{ color:"var(--text3)", fontSize:12, fontWeight:600 }}>{l.native}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  // ── PICK GOAL ──
  if (screen==="pick_goal") return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth:400, width:"100%", animation:"fadeUp .5s ease" }}>
        <h2 style={{ fontWeight:900, fontSize:26, marginBottom:4 }}>Яка мета? 🎯</h2>
        <p style={{ color:"var(--text2)", marginBottom:24, fontSize:14 }}>Це впливає на підбір слів та вправ</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {GOALS.map(g=>(
            <button key={g.id} onClick={()=>setGoal(g.id)} style={{ padding:"16px 12px", background:goal===g.id?"var(--green)22":"var(--bg3)", border:`1px solid ${goal===g.id?"var(--green)":"var(--border)"}`, borderRadius:14, cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
              <div style={{ fontSize:26, marginBottom:6 }}>{g.emoji}</div>
              <div style={{ fontWeight:900, fontSize:13, color:goal===g.id?"var(--green)":"var(--text1)" }}>{g.label}</div>
              <div style={{ color:"var(--text3)", fontSize:11, marginTop:3 }}>{g.desc}</div>
            </button>
          ))}
        </div>
        <h3 style={{ fontWeight:800, fontSize:16, marginBottom:12 }}>Рівень мови</h3>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {LEVELS.map(l=><button key={l} onClick={()=>setLevel(l)} style={{ flex:1, padding:"11px 6px", background:level===l?"var(--purple)":"var(--bg3)", border:`1px solid ${level===l?"var(--purple)":"var(--border)"}`, borderRadius:12, fontWeight:900, fontSize:14, color:level===l?"white":"var(--text2)", cursor:"pointer", transition:"all .15s" }}>{l}</button>)}
        </div>
        <GlowBtn onClick={()=>setScreen("home")} disabled={!goal} style={{ width:"100%", padding:"16px", fontSize:15 }}>Починаємо! →</GlowBtn>
      </div>
    </div>
  );
  // ── MAIN APP ──
  const TABS = [
    {id:"home",icon:"🏠",label:"Головна"},
    {id:"lessons",icon:"📚",label:"Уроки"},
    {id:"ai",icon:"🤖",label:"AI"},
    {id:"dictionary",icon:"📖",label:"Словник"},
    {id:"profile",icon:"👤",label:"Профіль"},
  ];
  const levelFilteredCards = getLevelCards();
  const filteredCards = cards.filter((c:any)=>{
    const matchTag=dictTag==="all"||c.tag===dictTag;
    const matchSearch=!dictSearch||c.en.toLowerCase().includes(dictSearch.toLowerCase())||c.uk.toLowerCase().includes(dictSearch.toLowerCase());
    return matchTag&&matchSearch;
  });
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", paddingBottom:"calc(64px + var(--safe-bottom))" }}>
      <style>{GLOBAL_CSS}</style>
      {/* HEADER */}
      <div style={{ background:"var(--bg2)", borderBottom:"1px solid var(--border)", padding:"12px 16px", paddingTop:"calc(12px + var(--safe-top))", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:16 }}>{lang?.flag}</span>
          <span style={{ fontWeight:900, fontSize:12, color:"var(--text2)", textTransform:"uppercase", letterSpacing:.8 }}>{lang?.name}</span>
          <span style={{ background:"var(--purple)22", color:"var(--purple)", border:"1px solid var(--purple)44", borderRadius:7, padding:"2px 7px", fontSize:10, fontWeight:800 }}>{level}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontWeight:900, color:"var(--orange)", fontSize:14 }}>🔥 {streak}</span>
          <span style={{ fontWeight:900, color:"var(--yellow)", fontSize:14 }}>⭐ {xp}</span>
          {dueCount>0&&<span style={{ background:"var(--red)", color:"white", borderRadius:9, padding:"2px 7px", fontWeight:900, fontSize:11 }}>{dueCount}</span>}
        </div>
      </div>
      {/* HOME */}
      {screen==="home" && (
        <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
          <div style={{ marginBottom:16, animation:"fadeUp .4s ease" }}>
            <h1 style={{ fontWeight:900, fontSize:24, marginBottom:2 }}>Привіт, {user?.name?.split(" ")[0]} 👋</h1>
            <p style={{ color:"var(--text2)", fontWeight:600, fontSize:13 }}>{dueCount>0?`${dueCount} карток чекають на повторення`:"Всі картки на сьогодні повторено! 🎉"}</p>
          </div>
          <ToxicBanner streak={streak} almostForgotten={almostForgotten} weakCards={weakCards}/>
          {almostForgotten.length>0&&(
            <div style={{ background:"var(--orange)11", border:"1px solid var(--orange)44", borderRadius:14, padding:"12px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:900, fontSize:13, color:"var(--orange)" }}>⚡ Майже забудеш!</div>
                <div style={{ fontSize:12, color:"var(--text2)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{almostForgotten.slice(0,3).map((c:any)=>c.en).join(", ")}</div>
              </div>
              <button onClick={()=>startMode("choice")} style={{ background:"var(--orange)", border:"none", borderRadius:10, padding:"8px 13px", fontWeight:900, fontSize:12, cursor:"pointer", color:"#000", flexShrink:0 }}>Повтори!</button>
            </div>
          )}
          {/* Stats */}
          <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {[
              {emoji:"🔥",value:streak,label:"Streak",color:"var(--orange)"},
              {emoji:"⭐",value:xp,label:"XP",color:"var(--yellow)"},
              {emoji:"📚",value:levelFilteredCards.filter((c:any)=>(c.srs?.repetitions||0)>=1).length,label:"Вивчено",color:"var(--blue)"},
            ].map(s=>(
              <div key={s.label} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 8px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:3 }}>{s.emoji}</div>
                <div style={{ fontWeight:900, fontSize:20, color:s.color }}>{s.value}</div>
                <div style={{ color:"var(--text3)", fontSize:11, fontWeight:700 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {dueCount>0&&(
            <div style={{ background:"linear-gradient(135deg,var(--green)22,var(--blue)22)", border:"1px solid var(--green)44", borderRadius:18, padding:"18px", marginBottom:18, animation:"glow 3s infinite" }}>
              <div style={{ fontWeight:900, fontSize:15, marginBottom:3 }}>⏰ Час повторювати!</div>
              <div style={{ color:"var(--text2)", fontSize:12, marginBottom:12 }}>{dueCount} карток пора повторити. Алгоритм підібрав ідеальний момент для рівня {level}.</div>
              <GlowBtn onClick={()=>startMode("choice")} style={{ padding:"11px 22px", fontSize:14 }}>Почати сесію →</GlowBtn>
            </div>
          )}
          {/* AI promo */}
          <div onClick={()=>setScreen("ai")} style={{ background:"linear-gradient(135deg,var(--purple)22,var(--blue)22)", border:"1px solid var(--purple)44", borderRadius:18, padding:"14px 16px", marginBottom:18, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ fontSize:22 }}>🤖</span>
              <div>
                <div style={{ fontWeight:900, fontSize:14, color:"var(--purple)" }}>AI-вчитель</div>
                <div style={{ fontSize:11, color:"var(--text2)" }}>Пояснення • Рольові ігри • Живі фрази</div>
              </div>
            </div>
            <div className="scroll-x" style={{ display:"flex", gap:6 }}>
              {["☕ Кава","😏 Флірт","🎵 TikTok","😤 Сварка"].map(s=><span key={s} style={{ background:"var(--purple)22", color:"var(--purple)", border:"1px solid var(--purple)33", borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, flexShrink:0 }}>{s}</span>)}
            </div>
          </div>
          {/* Modes */}
          <div style={{ fontWeight:900, color:"var(--text2)", textTransform:"uppercase", letterSpacing:1, fontSize:11, marginBottom:10 }}>РЕЖИМИ НАВЧАННЯ</div>
          <div className="modes-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              {mode:"choice",emoji:"🎯",label:"Тест",desc:"Оберіть переклад",color:"var(--blue)"},
              {mode:"type",emoji:"⌨️",label:"Введення",desc:"Напишіть переклад",color:"var(--green)"},
              {mode:"build",emoji:"🔤",label:"Збери слово",desc:"Склади з букв",color:"var(--purple)"},
              {mode:"fill",emoji:"📝",label:"Пропуск",desc:"Доповни речення",color:"var(--orange)"},
              {mode:"matching",emoji:"🔗",label:"Пари",desc:"З'єднай слова",color:"var(--yellow)"},
              {mode:"dictation",emoji:"🎧",label:"Диктант",desc:"Слухай та пиши",color:"var(--red)"},
            ].map(m=>(
              <button key={m.mode} onClick={()=>startMode(m.mode)} className="btn-press" style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 12px", textAlign:"left", cursor:"pointer" }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{m.emoji}</div>
                <div style={{ fontWeight:900, fontSize:13, color:m.color, marginBottom:1 }}>{m.label}</div>
                <div style={{ color:"var(--text3)", fontSize:11 }}>{m.desc}</div>
              </button>
            ))}
          </div>
          {weakCards.length>0&&(
            <div style={{ background:"var(--red)11", border:"1px solid var(--red)33", borderRadius:14, padding:"14px", marginTop:16 }}>
              <div style={{ fontWeight:900, fontSize:14, color:"var(--red)", marginBottom:8 }}>⚠️ Слабкі слова ({weakCards.length})</div>
              <div className="scroll-x" style={{ display:"flex", gap:6, marginBottom:10 }}>
                {weakCards.slice(0,6).map((c:any)=><span key={c.id} style={{ background:"var(--red)22", color:"var(--red)", border:"1px solid var(--red)44", borderRadius:8, padding:"3px 8px", fontSize:12, fontWeight:700, flexShrink:0 }}>{c.en}</span>)}
              </div>
              <button onClick={()=>{ setCards((c:any)=>c.map((card:any)=>weakCards.includes(card)?{...card,srs:{...card.srs,nextReview:Date.now()}}:card)); startMode("choice"); }} style={{ background:"var(--red)", color:"white", border:"none", borderRadius:10, padding:"9px 16px", fontWeight:800, fontSize:13, cursor:"pointer" }}>Повторити слабкі</button>
            </div>
          )}
        </div>
      )}
      {/* LESSONS */}
      {screen==="lessons" && (
        <LessonsTab cards={cards} level={level} langId={lang?.id||"en"} onStartLesson={startLesson} onStartCustomLesson={startCustomLesson}/>
      )}
      {/* AI */}
      {screen==="ai" && (
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ padding:"16px", borderBottom:"1px solid var(--border)" }}>
            <h2 style={{ fontWeight:900, fontSize:20, marginBottom:1 }}>🤖 AI-вчитель</h2>
            <p style={{ color:"var(--text2)", fontSize:12 }}>Питай що завгодно • Рольові ігри • Живі сценарії</p>
          </div>
          <AIChatScreen userName={user?.name} langName={lang?.name} level={level} cards={cards}/>
        </div>
      )}
      {/* DICTIONARY */}
      {screen==="dictionary" && (
        <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h2 style={{ fontWeight:900, fontSize:22 }}>📖 Словник</h2>
            <button onClick={()=>setShowAddForm(f=>!f)} style={{ background:showAddForm?"var(--green)":"var(--bg3)", color:showAddForm?"#000":"var(--green)", border:`1px solid var(--green)`, borderRadius:12, padding:"8px 14px", fontWeight:900, fontSize:13, cursor:"pointer", transition:"all .2s" }}>
              {showAddForm?"✕ Закрити":"+ Додати"}
            </button>
          </div>
          {/* Add form - collapsible */}
          {showAddForm && (
            <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:18, padding:"16px", marginBottom:16, animation:"fadeUp .2s ease" }}>
              <h3 style={{ fontWeight:900, fontSize:15, marginBottom:12 }}>Додати своє слово</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                <input value={addWord.en} onChange={e=>setAddWord({...addWord,en:e.target.value})} placeholder="Слово (мовою навчання)" style={{ padding:"13px 14px", background:"var(--bg4)", border:"1px solid var(--border2)", borderRadius:11, color:"var(--text1)", fontSize:14, fontWeight:700 }}/>
                <input value={addWord.uk} onChange={e=>setAddWord({...addWord,uk:e.target.value})} placeholder="Переклад (українською)" style={{ padding:"13px 14px", background:"var(--bg4)", border:"1px solid var(--border2)", borderRadius:11, color:"var(--text1)", fontSize:14, fontWeight:700 }}/>
                <input value={addWord.example} onChange={e=>setAddWord({...addWord,example:e.target.value})} placeholder="Приклад (необов'язково)" style={{ padding:"13px 14px", background:"var(--bg4)", border:"1px solid var(--border2)", borderRadius:11, color:"var(--text1)", fontSize:14, fontWeight:700 }}/>
                <div className="scroll-x" style={{ display:"flex", gap:6, paddingBottom:2 }}>
                  {TAGS.filter(t=>t.id!=="all").map(t=><Tag key={t.id} tag={t.id} selected={addWord.tag===t.id} onClick={()=>setAddWord({...addWord,tag:t.id})}/>)}
                </div>
                <GlowBtn onClick={addCustomWord} disabled={!addWord.en.trim()||!addWord.uk.trim()||addLoading} style={{ width:"100%", padding:"13px" }}>
                  {addLoading?"Додаємо...":"Зберегти"}
                </GlowBtn>
              </div>
            </div>
          )}
          {/* Search */}
          <input value={dictSearch} onChange={e=>setDictSearch(e.target.value)} placeholder="🔍 Пошук слова..." style={{ width:"100%", padding:"13px 16px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, color:"var(--text1)", fontSize:14, fontWeight:700, marginBottom:10 }}/>
          <div className="scroll-x" style={{ display:"flex", gap:7, paddingBottom:10, marginBottom:12 }}>
            {TAGS.map(t=><Tag key={t.id} tag={t.id} selected={dictTag===t.id} onClick={()=>setDictTag(t.id)}/>)}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {filteredCards.slice(0,60).map((card:any)=>(
              <div key={card.id} style={{ background:"var(--bg3)", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:900, fontSize:15 }}>{card.en}</span>
                    {card.level&&<span style={{ background:"var(--bg4)", color:"var(--text3)", borderRadius:5, padding:"1px 5px", fontSize:9, fontWeight:800 }}>{card.level}</span>}
                    <SRSBadge card={card}/>
                  </div>
                  <div style={{ color:"var(--text3)", fontSize:11, fontFamily:"'Space Mono',monospace" }}>{card.transcription}</div>
                  <div style={{ color:"var(--blue)", fontWeight:700, fontSize:13 }}>{card.uk}</div>
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button onClick={()=>speak(card.en,lang?.speakLang)} style={{ background:"var(--blue)22", border:"none", borderRadius:8, width:34, height:34, color:"var(--blue)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>🔊</button>
                  {card.id.startsWith("cust_")&&<button onClick={()=>deleteCard(card.id)} style={{ background:"var(--red)22", border:"none", borderRadius:8, width:34, height:34, color:"var(--red)", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>}
                </div>
              </div>
            ))}
            {filteredCards.length===0&&<div style={{ textAlign:"center", padding:36, color:"var(--text3)", fontWeight:700 }}>Нічого не знайдено</div>}
          </div>
        </div>
      )}
      {/* PROFILE */}
      {screen==="profile" && (
        <div style={{ padding:"16px", maxWidth:600, margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(135deg,var(--purple-dark),var(--blue-dark))", borderRadius:22, padding:"24px 20px", textAlign:"center", marginBottom:20 }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 10px" }}>🦜</div>
            <h2 style={{ fontWeight:900, fontSize:22, marginBottom:3 }}>{user?.name}</h2>
            <p style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>{lang?.flag} {lang?.name} • {level} • {GOALS.find(g=>g.id===goal)?.emoji} {GOALS.find(g=>g.id===goal)?.label}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              {emoji:"🔥",value:streak,label:"Streak днів",color:"var(--orange)"},
              {emoji:"⭐",value:xp,label:"Всього XP",color:"var(--yellow)"},
              {emoji:"📚",value:totalStats.sessions,label:"Сесій",color:"var(--blue)"},
              {emoji:"⏱️",value:`${totalStats.minutes}хв`,label:"Час навчання",color:"var(--purple)"},
              {emoji:"✅",value:totalStats.correct,label:"Правильних",color:"var(--green)"},
              {emoji:"🎯",value:totalStats.total>0?`${Math.round(totalStats.correct/totalStats.total*100)}%`:"—",label:"Точність",color:"var(--green)"},
            ].map(s=>(
              <div key={s.label} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:14, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:3 }}>{s.emoji}</div>
                <div style={{ fontWeight:900, fontSize:18, color:s.color }}>{s.value}</div>
                <div style={{ color:"var(--text3)", fontSize:11, fontWeight:700 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:16, padding:"16px", marginBottom:16 }}>
            <h3 style={{ fontWeight:900, fontSize:14, marginBottom:12 }}>📊 Прогрес карток</h3>
            {["new","learning","reviewing","mastered"].map(lvl=>{
              const count=cards.filter((c:any)=>SRS.getLevel(c)===lvl).length;
              const labels: any={new:"Нові",learning:"Вивчаю",reviewing:"Повторення",mastered:"Засвоєно"};
              const colors: any={new:"var(--blue)",learning:"var(--orange)",reviewing:"var(--purple)",mastered:"var(--green)"};
              return (
                <div key={lvl} style={{ marginBottom:9 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontWeight:700, fontSize:12, color:colors[lvl] }}>{labels[lvl]}</span>
                    <span style={{ fontWeight:800, fontSize:12, color:"var(--text2)" }}>{count}</span>
                  </div>
                  <ProgressBar value={count} max={cards.length} color={colors[lvl]} h={5}/>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            <button onClick={()=>setScreen("pick_lang")} style={{ padding:"14px 16px", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:12, fontWeight:800, fontSize:14, color:"var(--text1)", cursor:"pointer", textAlign:"left" }}>🌍 Змінити мову</button>
            <button onClick={()=>setScreen("pick_goal")} style={{ padding:"14px 16px", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:12, fontWeight:800, fontSize:14, color:"var(--text1)", cursor:"pointer", textAlign:"left" }}>🎯 Змінити ціль та рівень</button>
            <button onClick={()=>{setUser(null);setLang(null);setCards([]);setXp(0);setHistory([]);setTotal({sessions:0,correct:0,total:0,minutes:0});saveData({});setScreen("welcome");}} style={{ padding:"14px 16px", background:"var(--red)11", border:"1px solid var(--red)33", borderRadius:12, fontWeight:800, fontSize:14, color:"var(--red)", cursor:"pointer", textAlign:"left" }}>🚪 Вийти з акаунту</button>
          </div>
        </div>
      )}
      {/* BOTTOM NAV */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--bg2)", borderTop:"1px solid var(--border)", display:"flex", zIndex:50, paddingBottom:"var(--safe-bottom)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setScreen(t.id)} style={{ flex:1, paddingTop:10, paddingBottom:10, background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", color:screen===t.id?"var(--green)":"var(--text3)", transition:"color .15s", minHeight:56 }}>
            <span style={{ fontSize:20 }}>{t.icon}</span>
            <span style={{ fontWeight:900, fontSize:9, textTransform:"uppercase", letterSpacing:.5, lineHeight:1 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
