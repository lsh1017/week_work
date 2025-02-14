const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const axios = require("axios");

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

// ✅ 원정대 캐릭터 목록 가져오기
app.get("/expedition/:nickname", async (req, res) => {
    const { nickname } = req.params;
    console.log(`🔍 원정대 데이터 요청: ${nickname}`);

    try {
        const response = await axios.get(
            `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nickname)}/siblings`,
            { headers: { Authorization: `bearer ${process.env.LOST_ARK_API_KEY}` } }
        );

        if (!Array.isArray(response.data)) {
            return res.status(500).json({ error: "잘못된 API 응답" });
        }

        const sortedCharacters = response.data
            .map(char => ({
                CharacterName: char.CharacterName,
                CharacterClassName: char.CharacterClassName,
                ItemMaxLevel: parseFloat(char.ItemMaxLevel.replace(",", ""))
            }))
            .sort((a, b) => b.ItemMaxLevel - a.ItemMaxLevel)
            .slice(0, 6);

        console.log(`✅ 원정대 데이터 불러오기 완료: ${nickname}`);
        res.json(sortedCharacters);
    } catch (error) {
        console.error("❌ 원정대 데이터 가져오기 실패:", error.message);
        res.status(500).json({ error: "원정대 정보를 불러올 수 없습니다." });
    }
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

app.get("/raids", async (req, res) => {
    try {
        const raids = await mongoose.connection.db.collection("lostark.raids").find().toArray();
        res.json(raids);
    } catch (error) {
        console.error("❌ 레이드 목록 불러오기 실패:", error);
        res.status(500).json({ error: "레이드 정보를 가져올 수 없습니다." });
    }
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
