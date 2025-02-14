const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

const RAID_DATA_FILE = "./raids.json";
const USER_DATA_FILE = "./user_data.json";

app.use(cors());
app.use(express.json());

// ✅ MongoDB 연결 설정
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Atlas에 연결됨"))
  .catch(err => console.error("❌ MongoDB 연결 실패:", err));

// ✅ Lost Ark API 키 (환경 변수에서 가져오기)
const API_KEY = process.env.API_KEY;

// ✅ User 데이터 스키마 정의
const userSchema = new mongoose.Schema({
    nickname: String,
    selectedRaids: Object,
    selectedDifficulties: Object,
    extraIncome: Object
});

const User = mongoose.model("User", userSchema);

// ✅ 원정대 캐릭터 목록 가져오기 (상위 6개, 아이템 최대 레벨 내림차순 정렬)
app.get("/expedition/:nickname", async (req, res) => {
    const nickname = req.params.nickname;
    console.log(`🔍 원정대 데이터 요청: ${nickname}`);

    try {
        const response = await axios.get(
            `https://developer-lostark.game.onstove.com/characters/${nickname}/siblings`,
            { headers: { Authorization: `bearer ${API_KEY}`, "Content-Type": "application/json" } }
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

        console.log(`✅ 원정대 데이터 불러오기 완료: ${nickname}`); // ✅ 데이터 전체 출력 삭제

        res.json(sortedCharacters);
    } catch (error) {
        console.error("❌ 원정대 데이터 가져오기 실패:", error.message);
        res.status(500).json({ error: "원정대 정보를 불러올 수 없습니다." });
    }
});

// ✅ 사용자 체크한 레이드 데이터 불러오기 (닉네임 기반)
app.get("/user/:nickname", (req, res) => {
    const nickname = req.params.nickname;
    console.log(`🔍 [서버] 사용자 데이터 요청: ${nickname}`);

    const userData = loadJSON(USER_DATA_FILE, {});

    if (!userData[nickname]) {
        console.log("⚠️ [서버] 해당 닉네임의 저장된 데이터 없음.");
        return res.json({ 
            message: "이전에 체크한 데이터가 없습니다.", 
            selectedRaids: {}, 
            selectedDifficulties: {}, 
            extraIncome: {} 
        });
    }

    console.log("✅ [서버] 저장된 데이터 반환:", userData[nickname]);
    res.json(userData[nickname]);
});


// ✅ 사용자가 체크한 레이드 저장 (🔄 selectedDifficulties, extraIncome 포함)
app.post("/save-raids", (req, res) => {
    console.log("📥 저장 요청 받음:", req.body); 

    const { userId, selectedRaids, selectedDifficulties, extraIncome } = req.body;

    if (!userId || !selectedRaids || !selectedDifficulties || !extraIncome) {
        console.error("❌ [서버] 저장 실패: 요청 데이터 누락");
        return res.status(400).json({ error: "잘못된 요청 - 필수 데이터 누락" });
    }

    let userData = loadJSON(USER_DATA_FILE, {});
    userData[userId] = { selectedRaids, selectedDifficulties, extraIncome };

    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2));
    console.log("✅ 레이드 저장 완료!", userData);

    res.json({ message: "레이드 체크 상태 저장 완료" });
});



// ✅ 레이드 목록 가져오기 (0G이면 노말/하드 버튼 숨김)
app.get("/raids", (req, res) => {
    const raids = loadJSON(RAID_DATA_FILE, []);

    // ✅ 골드가 0이면 노말/하드 버튼 숨기기
    const filteredRaids = raids.map(raid => ({
        id: raid.id,
        name: raid.name,
        normalGold: raid.normalGold > 0 ? raid.normalGold : null,
        hardGold: raid.hardGold > 0 ? raid.hardGold : null
    }));

    res.json(filteredRaids);
});

// ✅ 레이드 초기화 (selectedDifficulties & extraIncome도 초기화)
app.post("/reset-raids", (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "잘못된 요청" });
    }

    let userData = loadJSON(USER_DATA_FILE, {});
    userData[userId] = { selectedRaids: {}, selectedDifficulties: {}, extraIncome: {} }; // ✅ 초기화

    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2));
    console.log("🗑 모든 체크 초기화 완료!", userData);

    res.json({ message: "모든 체크가 초기화되었습니다." });
});

// ✅ 서버 실행
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
