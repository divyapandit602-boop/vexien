/* VEXIEN Content — quotes, challenges, achievements, meal plans, demo community */

/* ---------------- Motivational quotes (36, rotates daily) ---------------- */
const QUOTES = [
["The secret of getting ahead is getting started.","Mark Twain"],
["It does not matter how slowly you go as long as you do not stop.","Confucius"],
["Strength does not come from the body. It comes from the will.","Gandhi"],
["The only bad workout is the one that didn't happen.","Unknown"],
["Take care of your body. It's the only place you have to live.","Jim Rohn"],
["Sweat is just fat crying.","Unknown"],
["Small daily improvements are the key to staggering long-term results.","Robin Sharma"],
["Your body can stand almost anything. It's your mind you have to convince.","Unknown"],
["Don't wish for it. Work for it.","Unknown"],
["A one-hour workout is 4% of your day. No excuses.","Unknown"],
["Motivation gets you started. Habit keeps you going.","Jim Ryun"],
["The pain you feel today will be the strength you feel tomorrow.","Unknown"],
["Push yourself, because no one else is going to do it for you.","Unknown"],
["Success is the sum of small efforts repeated day in and day out.","Robert Collier"],
["You don't have to be extreme, just consistent.","Unknown"],
["Fall seven times, stand up eight.","Japanese proverb"],
["The hard days are what make you stronger.","Aly Raisman"],
["Wellness is a connection of paths: knowledge and action.","Joshua Welch"],
["Start where you are. Use what you have. Do what you can.","Arthur Ashe"],
["Discipline is choosing between what you want now and what you want most.","Abraham Lincoln"],
["Exercise is a celebration of what your body can do, not a punishment.","Unknown"],
["Every champion was once a contender who refused to give up.","Rocky Balboa"],
["Rise up and attack the day with enthusiasm.","Unknown"],
["Healthy isn't a goal. It's a way of living.","Unknown"],
["You are one workout away from a good mood.","Unknown"],
["Doubt kills more dreams than failure ever will.","Suzy Kassem"],
["The body achieves what the mind believes.","Napoleon Hill"],
["Do something today that your future self will thank you for.","Sean Patrick Flanery"],
["It's not about having time. It's about making time.","Unknown"],
["Believe you can and you're halfway there.","Theodore Roosevelt"],
["Sore today, strong tomorrow.","Unknown"],
["Fitness is not about being better than someone else. It's about being better than you used to be.","Unknown"],
["What seems impossible today will one day become your warm-up.","Unknown"],
["Eat like you love yourself. Move like you love yourself. Speak like you love yourself.","Unknown"],
["Consistency is what transforms average into excellence.","Tony Robbins"],
["A healthy outside starts from the inside.","Robert Urich"]
];

/* ---------------- Challenge templates ---------------- */
const CHALLENGE_TEMPLATES = [
{id:"ch_30steps10k", name:"10K Steps — 30 Days", emoji:"🚶", type:"30-day", days:30, difficulty:"easy",
 metric:"steps", target:10000,
 description:"Walk at least 10,000 steps every single day for a month. Build an unbreakable walking habit.",
 rules:["Log 10,000+ steps daily","Manual step entries allowed","One missed day = 5% progress penalty","Check in every day"],
 reward:"Step Legend badge + 500 community points"},
{id:"ch_30plank", name:"30-Day Plank Progression", emoji:"🧘", type:"30-day", days:30, difficulty:"medium",
 metric:"workout", target:1, workoutFilter:"plank",
 description:"Add a plank (or any core workout) to your routine every day for 30 days and watch your core transform.",
 rules:["Log at least one workout daily","Any exercise counts, core preferred","No skipping — consistency is everything"],
 reward:"Core Crusher badge + 500 community points"},
{id:"ch_30sugar", name:"30-Day Clean Eating", emoji:"🥗", type:"30-day", days:30, difficulty:"medium",
 metric:"calorie_under", target:0,
 description:"Stay within your daily calorie goal for 30 days by choosing whole, clean foods over processed snacks.",
 rules:["Stay under your daily calorie target","Log all meals honestly","Sweets & fried snacks count against you"],
 reward:"Clean Eater badge + 600 community points"},
{id:"ch_60steps15k", name:"60-Day 15K Steps Warrior", emoji:"⚔️", type:"60-day", days:60, difficulty:"hard",
 metric:"steps", target:15000,
 description:"Raise the bar — 15,000 steps daily for 60 days. Only for the truly dedicated.",
 rules:["Log 15,000+ steps daily","Every day counts","Weekend walks strongly encouraged"],
 reward:"Steps Warrior badge + 1000 community points"},
{id:"ch_90transform", name:"90-Day Transformation", emoji:"🔥", type:"90-day", days:90, difficulty:"hard",
 metric:"any_log", target:1,
 description:"The ultimate 90-day journey: log food, workouts and weight consistently to transform your body and mind.",
 rules:["Log meals daily","Workout at least 4 days a week","Weigh in weekly","Progress photos encouraged"],
 reward:"Transformation Champion badge + 2000 community points"},
{id:"ch_deficit30", name:"30-Day Calorie Deficit", emoji:"📉", type:"30-day", days:30, difficulty:"medium",
 metric:"deficit", target:300,
 description:"Maintain a 300+ kcal daily deficit (food minus exercise) for steady, healthy fat loss.",
 rules:["Net calories must be 300+ below maintenance","Burn counts toward deficit","No crash dieting — stay healthy"],
 reward:"Deficit Master badge + 600 community points"},
{id:"ch_30workout", name:"30-Day No-Skip Streak", emoji:"🏋️", type:"30-day", days:30, difficulty:"medium",
 metric:"workout", target:1,
 description:"Log at least one workout every day for 30 days. Even a 10-minute stretch counts — just don't skip.",
 rules:["Minimum one logged workout per day","Any intensity, any duration","Rest days still need light movement"],
 reward:"Iron Streak badge + 700 community points"},
{id:"ch_30water", name:"30-Day Hydration Hero", emoji:"💧", type:"30-day", days:30, difficulty:"easy",
 metric:"water", target:8,
 description:"Drink and log 8 glasses of water every day for 30 days. Simple, powerful, life-changing.",
 rules:["Log 8+ glasses of water daily","Use the water widget on dashboard","Tea/coffee don't count as water"],
 reward:"Hydration Hero badge + 400 community points"}
];

/* ---------------- Achievement definitions ----------------
   check(stats) => {pct:0..1, done:bool}  (stats provided by Achievements engine) */
const ACHIEVEMENT_DEFS = [
{id:"ach_first_food", name:"First Bite", emoji:"🍎", desc:"Log your first food item.", type:"diet", req:1,
 check:s=>({pct:Math.min(1,s.foodCount/1),done:s.foodCount>=1})},
{id:"ach_first_workout", name:"First Burn", emoji:"🔥", desc:"Log your first workout.", type:"fitness", req:1,
 check:s=>({pct:Math.min(1,s.workoutCount/1),done:s.workoutCount>=1})},
{id:"ach_first_weight", name:"Starting Line", emoji:"🏁", desc:"Log your first weight entry.", type:"weight", req:1,
 check:s=>({pct:Math.min(1,s.weightCount/1),done:s.weightCount>=1})},
{id:"ach_streak7", name:"Week Warrior", emoji:"⚡", desc:"Maintain a 7-day logging streak.", type:"streak", req:7,
 check:s=>({pct:Math.min(1,s.streak/7),done:s.streak>=7})},
{id:"ach_streak30", name:"Unstoppable", emoji:"🏆", desc:"Maintain a 30-day logging streak.", type:"streak", req:30,
 check:s=>({pct:Math.min(1,s.streak/30),done:s.streak>=30})},
{id:"ach_steps5k", name:"Step Starter", emoji:"👟", desc:"Reach 5,000 steps in a day.", type:"steps", req:5000,
 check:s=>({pct:Math.min(1,s.maxSteps/5000),done:s.maxSteps>=5000})},
{id:"ach_steps10k", name:"Step Master", emoji:"🚶", desc:"Reach 10,000 steps in a day.", type:"steps", req:10000,
 check:s=>({pct:Math.min(1,s.maxSteps/10000),done:s.maxSteps>=10000})},
{id:"ach_steps15k", name:"Step Legend", emoji:"🌟", desc:"Reach 15,000 steps in a day.", type:"steps", req:15000,
 check:s=>({pct:Math.min(1,s.maxSteps/15000),done:s.maxSteps>=15000})},
{id:"ach_lose2", name:"Lighter Load", emoji:"⚖️", desc:"Lose 2.5 kg from your starting weight.", type:"weight", req:2.5,
 check:s=>({pct:s.startWeight?s.clamp01((s.startWeight-s.minWeight)/2.5):0,done:s.startWeight>0&&(s.startWeight-s.minWeight)>=2.5})},
{id:"ach_lose5", name:"Five Down", emoji:"🎉", desc:"Lose 5 kg from your starting weight.", type:"weight", req:5,
 check:s=>({pct:s.startWeight?s.clamp01((s.startWeight-s.minWeight)/5):0,done:s.startWeight>0&&(s.startWeight-s.minWeight)>=5})},
{id:"ach_lose10", name:"Double Digit Drop", emoji:"💎", desc:"Lose 10 kg from your starting weight.", type:"weight", req:10,
 check:s=>({pct:s.startWeight?s.clamp01((s.startWeight-s.minWeight)/10):0,done:s.startWeight>0&&(s.startWeight-s.minWeight)>=10})},
{id:"ach_calgoal7", name:"Goal Crusher", emoji:"🎯", desc:"Stay under your calorie goal for 7 different days.", type:"diet", req:7,
 check:s=>({pct:Math.min(1,s.daysUnderGoal/7),done:s.daysUnderGoal>=7})},
{id:"ach_protein7", name:"Protein Pro", emoji:"💪", desc:"Hit your protein target on 7 different days.", type:"diet", req:7,
 check:s=>({pct:Math.min(1,s.daysProteinHit/7),done:s.daysProteinHit>=7})},
{id:"ach_workout10", name:"Getting Strong", emoji:"🏅", desc:"Log 10 workouts.", type:"fitness", req:10,
 check:s=>({pct:Math.min(1,s.workoutCount/10),done:s.workoutCount>=10})},
{id:"ach_workout50", name:"Century Club (Halfway)", emoji:"🔨", desc:"Log 50 workouts.", type:"fitness", req:50,
 check:s=>({pct:Math.min(1,s.workoutCount/50),done:s.workoutCount>=50})},
{id:"ach_workout100", name:"Century Club", emoji:"💯", desc:"Log 100 workouts.", type:"fitness", req:100,
 check:s=>({pct:Math.min(1,s.workoutCount/100),done:s.workoutCount>=100})},
{id:"ach_burn5000", name:"Inferno", emoji:"🌋", desc:"Burn 5,000 calories through workouts.", type:"fitness", req:5000,
 check:s=>({pct:Math.min(1,s.totalBurned/5000),done:s.totalBurned>=5000})},
{id:"ach_challenge1", name:"Challenge Champion", emoji:"🥇", desc:"Complete your first challenge.", type:"challenge", req:1,
 check:s=>({pct:Math.min(1,s.challengesCompleted/1),done:s.challengesCompleted>=1})},
{id:"ach_challenge3", name:"Challenge Addict", emoji:"🎖️", desc:"Complete 3 challenges.", type:"challenge", req:3,
 check:s=>({pct:Math.min(1,s.challengesCompleted/3),done:s.challengesCompleted>=3})},
{id:"ach_friend1", name:"Social Butterfly", emoji:"🦋", desc:"Add your first friend.", type:"social", req:1,
 check:s=>({pct:Math.min(1,s.friends/1),done:s.friends>=1})},
{id:"ach_post1", name:"Share the Journey", emoji:"📣", desc:"Publish your first social post.", type:"social", req:1,
 check:s=>({pct:Math.min(1,s.posts/1),done:s.posts>=1})},
{id:"ach_recipe5", name:"Recipe Explorer", emoji:"👨‍🍳", desc:"Save 5 favorite recipes.", type:"diet", req:5,
 check:s=>({pct:Math.min(1,s.favRecipes/5),done:s.favRecipes>=5})},
{id:"ach_mealplan", name:"Meal Planner", emoji:"📋", desc:"Save a custom meal plan.", type:"diet", req:1,
 check:s=>({pct:Math.min(1,s.mealPlans/1),done:s.mealPlans>=1})},
{id:"ach_water30", name:"Hydration Hero", emoji:"💧", desc:"Log 8 glasses of water on 7 different days.", type:"health", req:7,
 check:s=>({pct:Math.min(1,s.daysWaterGoal/7),done:s.daysWaterGoal>=7})},
{id:"ach_weighin10", name:"Scale Regular", emoji:"📏", desc:"Log your weight 10 times.", type:"weight", req:10,
 check:s=>({pct:Math.min(1,s.weightCount/10),done:s.weightCount>=10})},
{id:"ach_foods100", name:"Food Diarist", emoji:"📖", desc:"Log 100 food entries.", type:"diet", req:100,
 check:s=>({pct:Math.min(1,s.foodCount/100),done:s.foodCount>=100})}
];

/* ---------------- Pre-designed meal plans (7 days each) ----------------
   item = [foodName(from FOOD_DB), servings, kcal] */
const MEAL_PLANS = [
{name:"Lean 1200", emoji:"🥗", target:1200, desc:"Gentle deficit plan for steady fat loss. Whole foods, high protein, veggie-forward.",
 days:[
  {breakfast:[["Masala Oats",1,230]], lunch:[["Chicken Breast Salad",1,320],["Lemonade",1,99]], dinner:[["Tomato Soup",1,74],["Grilled Salmon & Asparagus",0.6,252]], snacks:[["Apple",1,95],["Almonds",0.5,82]]},
  {breakfast:[["Greek Yogurt Parfait",1,280]], lunch:[["Sprouts Salad Bowl",1,180],["Roti / Chapati",2,208]], dinner:[["Dal Tadka",1,180],["Cucumber",1,16]], snacks:[["Orange",1,62],["Green Tea",1,2]]},
  {breakfast:[["Moong Dal Chilla",1,210]], lunch:[["Quinoa Salad Bowl",0.9,324]], dinner:[["Paneer Tikka",0.7,147],["Garden Salad",1,50],["Mixed Veg Curry",0.8,144]], snacks:[["Strawberries",1,49],["Roasted Chana",0.5,56]]},
  {breakfast:[["Veggie Omelette",1,260]], lunch:[["Rajma (kidney bean curry)",1,250],["Cucumber Salad",1,30]], dinner:[["Stir-Fried Greens & Garlic",1,110],["Tofu (firm)",0.8,115],["Brown Rice (cooked)",0.5,108]], snacks:[["Buttermilk (plain)",1,98],["Papaya",1,62]]},
  {breakfast:[["Overnight Oats Jar",0.8,272]], lunch:[["Chana Masala",1,280],["Garden Salad",1,50]], dinner:[["Miso Soup",1,60],["Chicken Stir-Fry",0.6,228]], snacks:[["Pear",1,101],["Walnuts",0.3,56]]},
  {breakfast:[["Besan Cheela",1,220]], lunch:[["Vegetable Pulao",0.8,304],["Raita",1,70]], dinner:[["Lentil Soup",1,180],["Spinach (cooked)",1,41]], snacks:[["Guava",1,112]]},
  {breakfast:[["Banana Protein Smoothie",0.8,248]], lunch:[["Mediterranean Tuna Salad",0.9,288]], dinner:[["Baingan Bharta",1,130],["Roti / Chapati",2,208]], snacks:[["Cantaloupe",1,54],["Pistachios",0.5,80]]}]},

{name:"Balanced 1500", emoji:"⚖️", target:1500, desc:"The sweet spot for most people — moderate deficit, plenty of energy for workouts.",
 days:[
  {breakfast:[["Overnight Oats Jar",1,340],["Green Tea",1,2]], lunch:[["Rajma (kidney bean curry)",1,250],["White Rice (cooked)",1,205],["Cucumber Salad",1,30]], dinner:[["Palak Paneer",1,320],["Roti / Chapati",1,104]], snacks:[["Apple",1,95],["Peanuts",0.7,113]]},
  {breakfast:[["Masala Dosa",0.8,280],["Sambar",1,150]], lunch:[["Chicken Breast Salad",1,320],["Quinoa (cooked)",0.5,111]], dinner:[["Dal Tadka",1,180],["Aloo Gobi",1,150],["Roti / Chapati",1,104]], snacks:[["Mango",1,99],["Almonds",0.7,115]]},
  {breakfast:[["Veggie Omelette",1,260],["Whole Wheat Bread",1,82]], lunch:[["Chana Masala",1,280],["Brown Rice (cooked)",1,216]], dinner:[["Grilled Salmon & Asparagus",0.8,336],["Sweet Potato (baked)",0.5,52]], snacks:[["Greek Yogurt (non-fat)",1,100],["Strawberries",1,49]]},
  {breakfast:[["Poha",1,250],["Whole Egg (boiled)",1,78]], lunch:[["Vegetable Biryani",1,390]], dinner:[["Tofu Stir-Fry",1,310]], snacks:[["Orange",1,62],["Roasted Chana",1,112]]},
  {breakfast:[["Banana Protein Smoothie",1,310]], lunch:[["Mixed Veg Curry",1,180],["White Rice (cooked)",1.5,308],["Raita",1,70]], dinner:[["Chicken Stir-Fry",0.8,304],["Cauliflower Rice Stir-Fry",0.5,110]], snacks:[["Papaya",1,62],["Walnuts",0.6,111]]},
  {breakfast:[["Moong Dal Chilla",1,210],["Mint Chutney",1,35]], lunch:[["Mediterranean Mezze Plate",0.9,378]], dinner:[["Fish Curry",1,240],["White Rice (cooked)",1,205]], snacks:[["Banana",1,105]]},
  {breakfast:[["Idli Sambar",1,230],["Filter Coffee",1,80]], lunch:[["Lentil & Vegetable Stew",1,330],["Whole Wheat Bread",1,82]], dinner:[["Paneer Bhurji",1,340],["Roti / Chapati",1,104]], snacks:[["Pineapple",1,82],["Pistachios",0.5,80]]}]},

{name:"Active 1800", emoji:"🏃", target:1800, desc:"Fuel for active days — supports 4-6 workouts a week while staying lean.",
 days:[
  {breakfast:[["Classic Oatmeal Porridge",1,280],["Whole Egg (boiled)",2,156]], lunch:[["Chicken Biryani",1,480],["Raita",1,70]], dinner:[["Dal Makhani",1,300],["Roti / Chapati",2,208]], snacks:[["Banana",1,105],["Peanut Butter",1,94]]},
  {breakfast:[["Masala Omelette Toast",1,340],["Masala Chai",1,90]], lunch:[["Rajma (kidney bean curry)",1,250],["White Rice (cooked)",1.5,308]], dinner:[["Grilled Salmon & Asparagus",1,420],["Sweet Potato (baked)",1,103]], snacks:[["Apple",1,95],["Mixed Nuts (roasted)",0.7,122]]},
  {breakfast:[["Poha",1,250],["Whole Egg (boiled)",2,156]], lunch:[["Chicken Stir-Fry",1,380],["Quinoa (cooked)",1,222]], dinner:[["Palak Paneer",1,320],["Roti / Chapati",2,208]], snacks:[["Mango Lassi",1,180]]},
  {breakfast:[["Besan Cheela",2,440],["Mint Chutney",1,35]], lunch:[["Mixed Veg Curry",1,180],["Brown Rice (cooked)",1.5,324],["Curd (dahi)",1,198]], dinner:[["Tofu Stir-Fry",1,310],["Miso Soup",1,60]], snacks:[["Orange",1,62],["Almonds",1,164]]},
  {breakfast:[["Banana Protein Smoothie",1,310],["Whole Wheat Bread",1,82]], lunch:[["Vegetable Pulao",1,320],["Paneer Tikka",0.8,224],["Raita",1,70]], dinner:[["Turkey Chili",1,340],["Couscous (cooked)",0.7,123]], snacks:[["Guava",1,112],["Greek Yogurt (non-fat)",1,100]]},
  {breakfast:[["Idli Sambar",1,230],["Medu Vada",1,250]], lunch:[["Fish Curry",1,240],["White Rice (cooked)",1.5,308]], dinner:[["Chana Masala",1,280],["Roti / Chapati",2,208]], snacks:[["Strawberries",1,49],["Dark Chocolate (70%)",0.7,119]]},
  {breakfast:[["Avocado Toast with Egg",1,350]], lunch:[["Chole Bhature",0.7,455],["Cucumber Salad",1,30]], dinner:[["Lemon Herb Roast Chicken",0.8,336],["Vegetable Soup",1,76],["Millet (cooked)",0.5,104]], snacks:[["Banana",1,105],["Protein Bar",0.5,110]]}]},

{name:"Muscle 2000+", emoji:"💪", target:2000, desc:"Calorie surplus with high protein for muscle gain and strength training.",
 days:[
  {breakfast:[["Banana Protein Smoothie",1,310],["Whole Egg (boiled)",2,156],["Whole Wheat Bread",1,82]], lunch:[["Chicken Biryani",1,480],["Raita",1,70]], dinner:[["Paneer Butter Masala",1,410],["Naan",1,262]], snacks:[["Peanut Butter",2,188],["Banana",1,105]]},
  {breakfast:[["Protein Pancake Stack",1,340],["Masala Chai",1,90]], lunch:[["Rajma (kidney bean curry)",1,250],["White Rice (cooked)",2,410]], dinner:[["Butter Chicken",1,490],["Roti / Chapati",1,104]], snacks:[["Mixed Nuts (roasted)",1,174],["Mango Lassi",1,180]]},
  {breakfast:[["Masala Omelette Toast",1,340],["Whole Milk",1,149]], lunch:[["Chicken Tikka Masala",1,490],["Brown Rice (cooked)",0.7,151]], dinner:[["Dal Makhani",1,300],["Aloo Paratha",1,290]], snacks:[["Protein Shake",1,130],["Dates (Medjool)",0.5,133]]},
  {breakfast:[["Overnight Oats Jar",1,340],["Whole Egg (boiled)",2,156]], lunch:[["Vegetable Biryani",1,390],["Paneer Tikka",1,280]], dinner:[["Honey Garlic Chicken Bowl",1,490]], snacks:[["Peanut Butter",1,94],["Apple",1,95],["Whole Milk",1,149]]},
  {breakfast:[["Ragi Banana Pancake",1,270],["Whole Milk",1,149],["Almonds",0.5,82]], lunch:[["Fish Curry",1,240],["White Rice (cooked)",2,410],["Curd (dahi)",0.5,99]], dinner:[["Mutton Curry",1,380],["Roti / Chapati",2,208]], snacks:[["Protein Bar",1,220],["Banana",1,105]]},
  {breakfast:[["Idli Sambar",1,230],["Omelette (2 eggs)",1,188]], lunch:[["Chole Bhature",1,650]], dinner:[["Tandoori Chicken",1,260],["Vegetable Pulao",1,320],["Raita",1,70]], snacks:[["Protein Shake",1,130],["Trail Mix",1,130]]},
  {breakfast:[["Classic Oatmeal Porridge",1,280],["Whole Milk",1,149],["Whole Egg (boiled)",2,156]], lunch:[["Chicken Fried Rice",1,450],["Spring Roll (veg)",1,98]], dinner:[["Palak Paneer",1,320],["Naan",1,262],["Dal Tadka",1,180]], snacks:[["Peanut Butter",1,94],["Mango",1,99]]}]}
];

/* ---------------- Demo community (used in Local Demo Mode) ---------------- */
const DEMO_USERS = [
{uid:"demo_u1", name:"Aarav Mehta", email:"aarav@demo.vexien", avatar:"😎", stepGoal:10000, base:{steps:9200, burn:340, workouts:5}, weightStart:78, weightNow:75.4},
{uid:"demo_u2", name:"Priya Kulkarni", email:"priya@demo.vexien", avatar:"🌸", stepGoal:8000, base:{steps:8100, burn:280, workouts:4}, weightStart:62, weightNow:60.1},
{uid:"demo_u3", name:"Rohan Deshmukh", email:"rohan@demo.vexien", avatar:"🦁", stepGoal:12000, base:{steps:11400, burn:520, workouts:6}, weightStart:85, weightNow:82.2},
{uid:"demo_u4", name:"Sara Khan", email:"sara@demo.vexien", avatar:"🦋", stepGoal:10000, base:{steps:10300, burn:410, workouts:5}, weightStart:58, weightNow:57.2},
{uid:"demo_u5", name:"Vikram Singh", email:"vikram@demo.vexien", avatar:"🐯", stepGoal:15000, base:{steps:13800, burn:600, workouts:7}, weightStart:92, weightNow:88.6},
{uid:"demo_u6", name:"Neha Joshi", email:"neha@demo.vexien", avatar:"🌺", stepGoal:8000, base:{steps:7400, burn:250, workouts:3}, weightStart:66, weightNow:65.8},
{uid:"demo_u7", name:"Arjun Nair", email:"arjun@demo.vexien", avatar:"🏄", stepGoal:11000, base:{steps:9900, burn:380, workouts:5}, weightStart:74, weightNow:73.1},
{uid:"demo_u8", name:"Isha Kapoor", email:"isha@demo.vexien", avatar:"🦄", stepGoal:9000, base:{steps:8600, burn:300, workouts:4}, weightStart:55, weightNow:54.3}
];

const DEMO_POST_TEMPLATES = [
["workout","Crushed a {n}-minute {e} session today! Feeling unstoppable 💪"],
["achievement","Just unlocked the {b} badge! Consistency is paying off 🏆"],
["milestone","Down {k} kg this month. Small steps, big results! ⚖️"],
["steps","{s} steps today! The 10K club never looked so good 🚶"],
["workout","Leg day done ✅ {n} minutes of pure grind. Who's joining tomorrow?"],
["achievement","Completed day {d} of my challenge — {c} 🔥"],
["milestone","New personal best this week. Progress over perfection! ✨"]
];

/* ---------------- Defaults ---------------- */
const DEFAULTS = {
  stepGoal: 10000,
  waterGoal: 8,
  macroRatio: {lose:{p:35,c:35,f:30}, maintain:{p:30,c:45,f:25}, gain:{p:30,c:45,f:25}},
  activityFactors: {sedentary:1.2, light:1.375, moderate:1.55, very:1.725, extra:1.9},
  goalAdjust: {lose:-500, maintain:0, gain:350},
  stepLengthKm: 0.000762,
  calPerStep: 0.042
};
