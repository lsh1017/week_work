const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ MongoDB 연결 설정
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Atlas에 연결됨"))
  .catch(err => console.error("❌ MongoDB 연결 실패:", err));

// ✅ User 데이터 스키마 정의
const userSchema = new mongoose.Schema({
    nickname: String,
    selectedRaids: Object,
    selectedDifficulties: Object,
    extraIncome: Object
});

const User = mongoose.model("User", userSchema);

// ✅ 사용자의 레이드 데이터 불러오기
app.get("/user/:nickname", async (req, res) => {
    const { nickname } = req.params;
    const user = await User.findOne({ nickname });

    if (!user) {
        return res.json({ selectedRaids: {}, selectedDifficulties: {}, extraIncome: {} });
    }

    res.json(user);
});

// ✅ 사용자의 체크한 레이드 저장
app.post("/save-raids", async (req, res) => {
    const { userId, selectedRaids, selectedDifficulties, extraIncome } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "잘못된 요청 - userId 없음" });
    }

    await User.findOneAndUpdate(
        { nickname: userId },
        { selectedRaids, selectedDifficulties, extraIncome },
        { upsert: true, new: true }
    );

    res.json({ message: "✅ 데이터 저장 완료!" });
});

// ✅ 레이드 목록 가져오기
const raidSchema = new mongoose.Schema({
    id: Number,
    name: String,
    normalGold: Number,
    hardGold: Number
});

const Raid = mongoose.model("Raid", raidSchema);

app.get("/raids", async (req, res) => {
    const raids = await Raid.find();
    res.json(raids);
});

// ✅ 레이드 초기화
app.post("/reset-raids", async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "잘못된 요청" });
    }

    await User.findOneAndUpdate(
        { nickname: userId },
        { selectedRaids: {}, selectedDifficulties: {}, extraIncome: {} }
    );

    res.json({ message: "모든 체크가 초기화되었습니다." });
});

// ✅ 서버 실행
app.listen(PORT, () => console.log(`🚀 서버 실행 중 PORT=${PORT}`));
