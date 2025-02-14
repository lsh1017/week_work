import { useState, useEffect } from "react";
import axios from "axios";
import "./styles.css"; // ✅ 스타일 적용
const API_URL = process.env.REACT_APP_API_BASE_URL;

function App() {
    const [nickname, setNickname] = useState("");
    const [characters, setCharacters] = useState([]);
    const [raids, setRaids] = useState([]);
    const [selectedRaids, setSelectedRaids] = useState({});
    const [selectedDifficulties, setSelectedDifficulties] = useState({});
    const [extraIncome, setExtraIncome] = useState({});
    const [totalGold, setTotalGold] = useState(0);
    const [characterGold, setCharacterGold] = useState({});

    useEffect(() => {
        axios.get(`${API_URL}/raids`).then(response => {
            setRaids(response.data);
        });
    }, []);

    const fetchExpeditionData = () => {
        if (!nickname.trim()) {
            alert("닉네임을 입력하세요!");
            return;
        }

        axios.get(`${API_URL}/expedition/${nickname}`)
            .then(response => {
                setCharacters(response.data);
                fetchUserData(nickname);
            })
            .catch(err => alert("원정대 정보를 불러올 수 없습니다."));
    };

    const fetchUserData = (nickname) => {
        axios.get(`${API_URL}/user/${nickname}`)
            .then(response => {
                setSelectedRaids(response.data.selectedRaids || {});
                setSelectedDifficulties(response.data.selectedDifficulties || {});
                setExtraIncome(response.data.extraIncome || {});
                calculateTotalGold(response.data.selectedRaids, response.data.selectedDifficulties, response.data.extraIncome);
            })
            .catch(err => console.error("❌ 사용자 데이터 불러오기 실패:", err));
    };
    console.log("🔍 API_URL:", API_URL);

    const handleRaidSelection = (character, raidId) => {
        let updatedSelections = { ...selectedRaids };
        let updatedDifficulties = { ...selectedDifficulties };

        if (!Array.isArray(updatedSelections[character])) {
            updatedSelections[character] = [];
        }

        if (updatedSelections[character].includes(raidId)) {
            updatedSelections[character] = updatedSelections[character].filter(id => id !== raidId);
            delete updatedDifficulties[`${character}_${raidId}`];
        } else {
            if (updatedSelections[character].length < 3) {
                updatedSelections[character].push(raidId);
                updatedDifficulties[`${character}_${raidId}`] = "normal";
            } else {
                alert("각 캐릭터는 최대 3개의 레이드를 체크할 수 있습니다.");
                return;
            }
        }

        setSelectedRaids(updatedSelections);
        setSelectedDifficulties(updatedDifficulties);
        calculateTotalGold(updatedSelections, selectedDifficulties, extraIncome);
    };

    // const handleDifficultyChange = (character, raidId) => {
    //     setSelectedDifficulties(prevDifficulties => {
    //         const currentDifficulty = prevDifficulties[`${character}_${raidId}`] || "normal";
    //         const newDifficulty = currentDifficulty === "hard" ? "normal" : "hard";
    
    //         const updatedDifficulties = { ...prevDifficulties, [`${character}_${raidId}`]: newDifficulty };
    
    //         // ✅ 난이도 변경 후 총 골드 다시 계산
    //         calculateTotalGold(selectedRaids, updatedDifficulties, extraIncome);
    //         return updatedDifficulties;
    //     });
    // };    
    const handleDifficultyChange = (character, raidId, newDifficulty) => {
        setSelectedDifficulties(prevDifficulties => ({
            ...prevDifficulties,
            [`${character}_${raidId}`]: newDifficulty
        }));
    };
    
    // ✅ 난이도 변경 후 골드 값을 자동으로 다시 계산
    useEffect(() => {
        calculateTotalGold(selectedRaids, selectedDifficulties, extraIncome);
    }, [selectedDifficulties]); // ✅ 난이도 변경 감지
    
        
    const calculateTotalGold = (selections, difficulties, extraIncomeData) => {
        let sum = 0;
        let charGold = {};

        Object.entries(selections).forEach(([character, raidList]) => {
            let charSum = 0;
            if (!Array.isArray(raidList)) return;

            raidList.forEach(raidId => {
                const raid = raids.find(r => r.id === raidId);
                if (raid) {
                    let difficulty = difficulties[`${character}_${raidId}`] || "normal";
                    let raidGold = difficulty === "hard" ? raid.hardGold : raid.normalGold;
                    charSum += raidGold;
                    sum += raidGold;
                }
            });

            let extraGold = extraIncomeData[character] ? parseInt(extraIncomeData[character], 10) : 0;
            charGold[character] = charSum + extraGold;
            sum += extraGold;
        });

        setTotalGold(sum);
        setCharacterGold(charGold);
    };

    const handleSave = () => {
        if (!nickname) {
            alert("닉네임을 입력하세요.");
            return;
        }

        const data = {
            userId: nickname,
            selectedRaids: selectedRaids || {},
            selectedDifficulties: selectedDifficulties || {},
            extraIncome: extraIncome || {}
        };

        axios.post(`${API_URL}/save-raids`, data)
            .then(() => alert("✅ 데이터가 저장되었습니다."))
            .catch(err => alert("❌ 저장에 실패했습니다."));
    };

    const handleReset = () => {
        setSelectedRaids({});
        setSelectedDifficulties({});
        setExtraIncome({});
        setTotalGold(0);
        setCharacterGold({});
    };

    return (
        <div>
            <h1>🔍 Lost Ark 원정대 검색</h1>

            <div className="search-container">
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="캐릭터 닉네임 입력" />
                <button onClick={fetchExpeditionData}>검색</button>
                <div className="button-group">
                    <button onClick={handleSave}>💾 저장</button>
                    <button onClick={handleReset}>🗑 초기화</button>
                </div>
                <h2 className="total-gold">💰 총 정산 골드: {totalGold} G</h2>
            </div>

            <div className="character-grid">
                {characters.map((char, index) => (
                    <div key={index} className="character-box">
                        <div className="character-header">
                            {char.CharacterName} ({char.CharacterClassName})
                            <br />
                            <span>Lv. {char.ItemMaxLevel}</span>
                        </div>

                        <div className="raid-list">
                            {raids.map((raid) => (
                                <div key={raid.id} className="raid-item" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
                                    {/* 체크박스 + 레이드명 + 골드 */}
                                    <label style={{ display: "flex", alignItems: "center", flexGrow: 1, gap: "10px" }}>
                                        <input 
                                            type="checkbox" 
                                            onChange={() => handleRaidSelection(char.CharacterName, raid.id)}
                                            checked={selectedRaids[char.CharacterName]?.includes(raid.id) || false} 
                                        />
                                        <span>{raid.name}</span>
                                        <span style={{ fontWeight: "bold" }}>
                                            ({selectedDifficulties[`${char.CharacterName}_${raid.id}`] === "hard" ? raid.hardGold : raid.normalGold}G)
                                        </span>
                                    </label>

                                    {/* 노말/하드 버튼 */}
                                    {raid.normalGold > 0 && raid.hardGold > 0 && (
                                        <div className="toggle-switch">
                                            <button 
                                                className={`toggle-option ${selectedDifficulties[`${char.CharacterName}_${raid.id}`] === "normal" ? "active" : ""}`}
                                                onClick={() => handleDifficultyChange(char.CharacterName, raid.id, "normal")}
                                            >
                                                노말
                                            </button>
                                            <button 
                                                className={`toggle-option ${selectedDifficulties[`${char.CharacterName}_${raid.id}`] === "hard" ? "active" : ""}`}
                                                onClick={() => handleDifficultyChange(char.CharacterName, raid.id, "hard")}
                                            >
                                                하드
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>


                        <input type="number" placeholder="기타 수입 입력"
                               onChange={(e) => {
                                   let updatedIncome = { ...extraIncome, [char.CharacterName]: e.target.value };
                                   setExtraIncome(updatedIncome);
                                   calculateTotalGold(selectedRaids, selectedDifficulties, updatedIncome);
                               }}
                        />

                        <p>캐릭터 합계: {characterGold[char.CharacterName] || 0} G</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
