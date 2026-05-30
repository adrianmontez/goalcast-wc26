"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import TabBar from "@/components/TabBar";
import { groups } from "@/data/wc2026Data";
import { knockoutSeeding } from "@/data/knockoutSeeding";
import { thirdPlaceMapping } from "@/data/thirdPlaceMapping";

export default function Predict() {
  const bracketImageRef = useRef(null);
  const [generatedBracketImage, setGeneratedBracketImage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [rankings, setRankings] = useState(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("wc2026_rankings");
    return saved ? JSON.parse(saved) : {};
  });
  const [advancing, setAdvancing] = useState(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("wc2026_advancing_third_place");
    return saved ? JSON.parse(saved) : {};
  });
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [touchTeam, setTouchTeam] = useState(null);
  const [selectedMobileTeam, setSelectedMobileTeam] = useState(null);
  const [showBracket, setShowBracket] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("wc2026_predict_view");
    return saved === "bracket";
  });
  const [bracketWinners, setBracketWinners] = useState(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("wc2026_bracket");
    return saved ? JSON.parse(saved) : {};
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("wc2026_rankings", JSON.stringify(rankings));
  }, [rankings]);

  useEffect(() => {
    localStorage.setItem("wc2026_bracket", JSON.stringify(bracketWinners));
  }, [bracketWinners]);

  useEffect(() => {
    localStorage.setItem(
      "wc2026_advancing_third_place",
      JSON.stringify(advancing)
    );
  }, [advancing]);

  useEffect(() => {
    localStorage.setItem(
      "wc2026_predict_view",
      showBracket ? "bracket" : "groups"
    );
  }, [showBracket]);

  const getAdvancingThirdPlaceTeams = () => {
    const teams = [];
    groups.forEach((groupData) => {
      const key = `3rd_${groupData.group}`;
      if (advancing[key]) {
        teams.push({
          abbr: advancing[key],
          group: groupData.group,
          label: `3${groupData.group}`,
        });
      }
    });
    return teams;
  };

  const countAdvancingThirdPlace = () => {
    return getAdvancingThirdPlaceTeams().length;
  };


  const getInitialRanking = (groupId) => {
    const groupKey = `group_${groupId}`;
    if (rankings[groupKey]) return rankings[groupKey];

    const groupData = groups.find((g) => g.group === groupId);
    if (!groupData) return {};

    const initial = {};
    groupData.teams.forEach((team, index) => {
      initial[team.abbr] = index + 1;
    });
    return initial;
  };

  const getRanking = (groupId) => {
    const groupKey = `group_${groupId}`;
    return rankings[groupKey] || getInitialRanking(groupId);
  };

  const getTeamAtRank = (groupId, rank) => {
    const groupRanking = getRanking(groupId);
    return Object.entries(groupRanking).find(([_, r]) => r === rank)?.[0] || null;
  };

  const getThirdPlaceTeam = (groupId) => {
    return getTeamAtRank(groupId, 3);
  };

  const getSelectedThirdPlaceKey = () => {
    return getAdvancingThirdPlaceTeams()
      .map((team) => team.group)
      .sort()
      .join("");
  };

  const getThirdPlaceMatchMapping = () => {
    const key = getSelectedThirdPlaceKey();
    return thirdPlaceMapping[key] || null;
  };

  const resolveSeedReference = (seed, matchNumber, matchResults) => {
    if (!seed) return null;

    if (/^[12][A-L]$/.test(seed)) {
      const rank = Number(seed[0]);
      const group = seed[1];
      return getTeamAtRank(group, rank);
    }

    if (/^3[A-L]$/.test(seed)) {
      return getThirdPlaceTeam(seed[1]);
    }

    if (/^3[A-L]{2,}$/.test(seed)) {
      const mapping = getThirdPlaceMatchMapping();
      if (!mapping) return null;
      const mapped = mapping[matchNumber];
      if (!mapped) return null;
      return getThirdPlaceTeam(mapped[1]);
    }

    if (/^W\d+$/.test(seed)) {
      const previous = matchResults[`M${seed.slice(1)}`];
      return previous?.winner || null;
    }

    if (/^L\d+$/.test(seed)) {
      const previous = matchResults[`M${seed.slice(1)}`];
      return previous?.loser || null;
    }

    return null;
  };

  const buildBracketMatches = () => {
    const matchResults = {};

    return knockoutSeeding.map((match) => {
      const teamA = resolveSeedReference(match.teamA, match.matchNumber, matchResults);
      const teamB = resolveSeedReference(match.teamB, match.matchNumber, matchResults);
      const winner = bracketWinners[match.matchNumber] || null;
      const loser = winner === teamA ? teamB : winner === teamB ? teamA : null;
      const result = { ...match, teamA, teamB, winner, loser };
      matchResults[match.matchNumber] = result;
      return result;
    });
  };

  function isBracketComplete() {
    const bracketMatches = buildBracketMatches();

    const predictionRounds = [
      "Round of 32",
      "Round of 16",
      "Quarterfinals",
      "Semifinals",
      "Final",
    ];

    return bracketMatches
      .filter((match) => predictionRounds.includes(match.roundType))
      .every((match) => {
        if (!match.teamA || !match.teamB) return false;

        return Boolean(bracketWinners[match.matchNumber]);
      });
  }

  function getPredictedChampion() {
    const bracketMatches = buildBracketMatches();

    const finalMatch = bracketMatches.find(
      (match) => match.roundType === "Final"
    );

    return finalMatch?.winner || null;
  }

  async function generateBracketImage() {
    if (!bracketImageRef.current) return;
    if (!isBracketComplete()) return;

    setIsGeneratingImage(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const dataUrl = await toPng(bracketImageRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });

      setGeneratedBracketImage(dataUrl);
    } catch (error) {
      console.error("Failed to generate bracket image:", error);
    }

    setIsGeneratingImage(false);
  }

  function downloadBracketImage() {
    if (!generatedBracketImage) return;

    const link = document.createElement("a");
    link.href = generatedBracketImage;
    link.download = "goalcast-wc26-bracket.png";
    link.click();
  }

  const selectWinner = (matchId, winner, teamA, teamB) => {
    // Do not allow picks until both teams are known
    if (!teamA || !teamB) return;

    setBracketWinners((prev) => {
      const current = prev[matchId];

      if (current === winner) {
        const { [matchId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [matchId]: winner };
    });
  };


  const toggleThirdPlace = (groupId, teamAbbr) => {
    const key = `3rd_${groupId}`;
    const isCurrentlyChecked = advancing[key];
    const totalChecked = countAdvancingThirdPlace();

    if (isCurrentlyChecked) {
      setAdvancing((current) => {
        const updated = { ...current };
        delete updated[key];
        return updated;
      });
    } else if (totalChecked < 8) {
      setAdvancing((current) => ({
        ...current,
        [key]: teamAbbr,
      }));
    }
  };

  const moveTeamToRank = (teamAbbr, groupId, targetRank) => {
    if (showBracket || !teamAbbr) return;

    setRankings((current) => {
      const groupKey = `group_${groupId}`;
      const groupRanking = { ...getRanking(groupId) };

      // Prevent moving a team into a group it does not belong to
      if (!(teamAbbr in groupRanking)) {
        return current;
      }

      const currentRank = groupRanking[teamAbbr];

      if (currentRank === targetRank) {
        return current;
      }

      const teamAtTarget = Object.entries(groupRanking).find(
        ([_, r]) => r === targetRank
      )?.[0];

      if (teamAtTarget) {
        groupRanking[teamAtTarget] = currentRank;
      }

      groupRanking[teamAbbr] = targetRank;

      return { ...current, [groupKey]: groupRanking };
    });
  };

  const handleMobileTap = (teamAbbr, groupId, targetRank) => {
    if (showBracket || !teamAbbr) return;

    if (!selectedMobileTeam) {
      setSelectedMobileTeam({ teamAbbr, groupId });
      return;
    }

    if (selectedMobileTeam.groupId === groupId) {
      moveTeamToRank(selectedMobileTeam.teamAbbr, groupId, targetRank);
    }

    setSelectedMobileTeam(null);
  };

  const handleDragStart = (e, teamAbbr, groupId) => {
    if (showBracket) return;

    setDraggedTeam({
      teamAbbr,
      groupId,
    });

    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    if (showBracket) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, groupId, targetRank) => {
    if (showBracket) return;
    e.preventDefault();

    if (!draggedTeam) return;

    // Do not allow swapping teams across different groups
    if (draggedTeam.groupId !== groupId) {
      setDraggedTeam(null);
      return;
    }

    moveTeamToRank(draggedTeam.teamAbbr, groupId, targetRank);
    setDraggedTeam(null);
  };

  return (
    <main className="relative min-h-screen bg-black text-white p-4 pb-12">
      <Image
        src="/images/goalcast_trophy.png"
        alt="GoalCast Trophy"
        width={40}
        height={40}
        className="absolute top-4 right-4 object-contain"
      />
      <h1 className="text-2xl font-bold mb-4">2026 World Cup Predictions</h1>

      {!showBracket && (
        <section className="p-3">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Group Stage</h2>
            <p className="text-xs text-gray-400">
              Rank each team 1-4. Top 2 automatically advance.
            </p>
          </div>
          <button
            onClick={() => {
              setRankings({});
              setAdvancing({});
            }}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Reset Picks
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {groups.map((groupData) => {
            const ranking = getRanking(groupData.group);
            const thirdPlaceTeam = getThirdPlaceTeam(groupData.group);
            const thirdPlaceAdvancingKey = `3rd_${groupData.group}`;
            const isThirdPlaceChecked = advancing[thirdPlaceAdvancingKey];
            const totalAdvancing = countAdvancingThirdPlace();
            const canEnableThirdPlace = totalAdvancing < 8 || isThirdPlaceChecked;

            return (
              <div
                key={groupData.group}
                className="border border-white p-4 rounded"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Group {groupData.group}</h3>
                </div>

                <div className="space-y-2">
                  {[1, 2, 3, 4].map((rank) => {
                    const teamAbbr = getTeamAtRank(groupData.group, rank);
                    return (
                      <div
                        key={rank}
                        className={`flex gap-2 items-center ${
                          rank <= 2
                            ? "bg-yellow-500/20 border border-yellow-400 rounded-xl p-1 shadow-[0_0_8px_rgba(250,204,21,0.45)]"
                            : ""
                        }`}
                      >
                        <span className="font-semibold text-white min-w-4 text-sm">
                          {rank}{groupData.group}
                        </span>
                        <div
                          draggable={!showBracket && Boolean(teamAbbr)}
                          onDragStart={(e) =>
                            teamAbbr && handleDragStart(e, teamAbbr, groupData.group)
                          }
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, groupData.group, rank)}
                          onClick={() => handleMobileTap(teamAbbr, groupData.group, rank)}
                          className={`border rounded p-2 min-h-12 flex items-center bg-gray-900 ${
                            selectedMobileTeam?.teamAbbr === teamAbbr
                              ? "border-yellow-400 bg-yellow-500/20"
                              : "border-gray-700"
                          } ${!showBracket ? "hover:bg-gray-800 cursor-grab touch-none" : ""} flex-1`}
                        >
                          <div className="flex items-center w-full select-none">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {teamAbbr ? (
                                <>
                                  <Image
                                    src={`/flags/${teamAbbr}.png`}
                                    alt={`${teamAbbr} flag`}
                                    width={20}
                                    height={14}
                                    className="object-cover shrink-0"
                                  />
                                  <span className="text-sm font-semibold truncate">{teamAbbr}</span>
                                </>
                              ) : (
                                <div className="text-gray-500 text-sm">Drop here</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3rd Place Teams */}
        {groups.length > 0 && (
          <div className="mt-8">
            <div className="border border-white p-4 rounded">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">3rd Place Teams</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Click 8 of the 12 third-place teams to advance to the Knockout Stage.
                <span className="ml-2">({countAdvancingThirdPlace()}/8 selected)</span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groups.map((groupData) => {
                  const teamAbbr = getThirdPlaceTeam(groupData.group);
                  const key = `3rd_${groupData.group}`;
                  const selected = Boolean(advancing[key]);
                  const canToggle = !showBracket && (selected || countAdvancingThirdPlace() < 8);

                  return (
                    <button
                      key={groupData.group}
                      type="button"
                      onClick={() => canToggle && toggleThirdPlace(groupData.group, teamAbbr)}
                      className={`border rounded p-3 text-left transition ${selected ? 'border-yellow-400 bg-yellow-500/15' : 'border-gray-700 bg-gray-900 hover:border-white'} ${!canToggle ? 'opacity-60 cursor-grab touch-none' : ''}flex-1`}
                    >
                      <div className="text-xs text-gray-400 mb-1">3{groupData.group}</div>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {teamAbbr ? (
                          <>
                            <Image
                              src={`/flags/${teamAbbr}.png`}
                              alt={`${teamAbbr} flag`}
                              width={20}
                              height={14}
                              className="object-cover"
                            />
                            <span>{teamAbbr}</span>
                          </>
                        ) : (
                          'TBD'
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  disabled={countAdvancingThirdPlace() !== 8}
                  onClick={() => {
                    if (countAdvancingThirdPlace() !== 8) return;
                    setShowBracket(true);
                  }}
                  className={
                    countAdvancingThirdPlace() === 8
                      ? "bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200"
                      : "bg-gray-700 text-gray-400 px-4 py-2 rounded font-semibold cursor-not-allowed"
                  }
                >
                  {countAdvancingThirdPlace() === 8
                    ? "Lock In Picks"
                    : `Choose ${8 - countAdvancingThirdPlace()} more`}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {showBracket && (
        <section className="p-3">
          <div className="mb-6 flex justify-center gap-4">
            <button
              onClick={() => {
                setShowBracket(false);
                setBracketWinners({});
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded font-semibold hover:bg-gray-600"
            >
              Edit Group Stage Picks
            </button>
            <button
              onClick={() => setBracketWinners({})}
              className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700"
            >
              Reset Picks
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-4 text-center">Knockout Stage</h2>

          {(() => {
            const bracketMatches = buildBracketMatches();
            const predictedChampion = getPredictedChampion();
            const roundOrder = [
              'Round of 32',
              'Round of 16',
              'Quarterfinals',
              'Semifinals',
              'Final',
            ];
            const rounds = roundOrder.map((name) => ({
              name,
              matches: bracketMatches
                .filter((match) => match.roundType === name)
                .sort((a, b) => {
                  if (name === 'Round of 32') {
                    const order = [
                      'M74','M77','M73','M75',
                      'M76','M78','M79','M80',
                      'M83','M84','M81','M82',
                      'M86','M88','M85','M87',
                    ];
                    return order.indexOf(a.matchNumber) - order.indexOf(b.matchNumber);
                  }
                  if (name === 'Round of 16') {
                    const order = ['M89','M90','M91','M92','M93','M94','M95','M96'];
                    return order.indexOf(a.matchNumber) - order.indexOf(b.matchNumber);
                  }
                  if (name === 'Quarterfinals') {
                    const order = ['M97','M99','M98','M100'];
                    return order.indexOf(a.matchNumber) - order.indexOf(b.matchNumber);
                  }
                  if (name === 'Semifinals') {
                    const order = ['M101','M102'];
                    return order.indexOf(a.matchNumber) - order.indexOf(b.matchNumber);
                  }
                  if (name === 'Final') {
                    const order = ['M104'];
                    return order.indexOf(a.matchNumber) - order.indexOf(b.matchNumber);
                  }
                  return 0;
                }),
            }));

            return (
              <div className="overflow-x-auto">
                <div
                    ref={bracketImageRef}
                    className="w-[1400px] bg-black text-white border border-gray-700 p-4 overflow-hidden"
                  >
                  <div className="mb-3 flex items-center justify-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/goalcast_soccerball.png"
                      alt="Soccer ball"
                      className="h-[42px] w-[42px] object-contain"
                    />

                    <h3 className="text-3xl font-extrabold text-center">
                      2026 World Cup Predictions
                    </h3>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/goalcast_soccerball.png"
                      alt="Soccer ball"
                      className="h-[42px] w-[42px] object-contain"
                    />
                  </div> 

                  <p className="text-xs text-gray-400 text-center mb-4">
                    Made on GoalCast
                  </p>

                  <div className="relative grid grid-cols-5 gap-5">
                    {rounds.map((round) => (
                      <div key={round.name} className="flex h-full flex-col">
                        <h4 className="mb-3 text-center text-lg font-bold">{round.name}</h4>

                        <div
                          className={
                            round.name === "Round of 32"
                              ? "grid grid-cols-2 gap-3"
                              : "space-y-3"
                          }
                        >
                          {round.matches.map((match) => {
                            const team1 = match.teamA;
                            const team2 = match.teamB;
                            const winner = bracketWinners[match.matchNumber] || null;
                            const isWinner1 = winner === team1;
                            const isWinner2 = winner === team2;
                            const matchupReady = Boolean(team1 && team2);

                            return (
                              <div
                                key={match.matchNumber}
                                className="border border-gray-600 p-3 rounded bg-gray-900"
                              >
                                <div className="space-y-2">
                                  {team1 ? (
                                    <div
                                      onClick={() =>
                                        selectWinner(match.matchNumber, team1, team1, team2)
                                      }
                                      className={`border border-gray-600 flex items-center justify-center gap-2 p-2 rounded ${
                                        isWinner1
                                          ? "bg-yellow-600 border-yellow-400"
                                          : matchupReady
                                            ? "hover:bg-gray-800 cursor-pointer"
                                            : "opacity-50 cursor-not-allowed"
                                      }`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`/flags/${team1}.png`}
                                        alt={`${team1} flag`}
                                        className="h-[15px] w-[20px] object-cover"
                                      />
                                      <span className="text-sm font-semibold">{team1}</span>
                                    </div>
                                  ) : (
                                    <div className="border border-gray-600 flex items-center justify-center gap-2 p-2 rounded bg-gray-700">
                                      <span className="text-sm text-gray-400">TBD</span>
                                    </div>
                                  )}

                                  <div className="text-center text-xs text-gray-400">vs</div>

                                  {team2 ? (
                                    <div
                                      onClick={() =>
                                        selectWinner(match.matchNumber, team2, team1, team2)
                                      }
                                      className={`border border-gray-600 flex items-center justify-center gap-2 p-2 rounded ${
                                        isWinner2
                                          ? "bg-yellow-600 border-yellow-400"
                                          : matchupReady
                                            ? "hover:bg-gray-800 cursor-pointer"
                                            : "opacity-50 cursor-not-allowed"
                                      }`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={`/flags/${team2}.png`}
                                        alt={`${team2} flag`}
                                        className="h-[15px] w-[20px] object-cover"
                                      />
                                      <span className="text-sm font-semibold">{team2}</span>
                                    </div>
                                  ) : (
                                    <div className="border border-gray-600 flex items-center justify-center gap-2 p-2 rounded bg-gray-700">
                                      <span className="text-sm text-gray-400">TBD</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {predictedChampion && (
                      <div className="absolute bottom-0 right-0 w-[40%]">
                        <div className="flex items-stretch justify-end gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/images/goalcast_trophy.png"
                            alt="Trophy"
                            className="h-[165px] w-auto object-contain shrink-0"
                          />

                          <div className="h-[165px] flex-1 overflow-hidden border-2 border-yellow-400 bg-yellow-500/10 rounded-xl px-3 py-3">
                            <div className="flex h-full flex-col items-center justify-center text-center">
                              <p className="mb-2 text-base font-bold uppercase leading-tight tracking-wide text-gray-200">
                                2026 World Cup Champion
                              </p>

                              <p className="text-5xl font-extrabold leading-none text-yellow-400">
                                {predictedChampion}
                              </p>

                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/flags/${predictedChampion}.png`}
                                alt={`${predictedChampion} flag`}
                                className="mt-3 h-[65px] w-[98px] object-cover border border-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>    
            );
          })()}
          <div className="mt-6 flex justify-center">
            <button
              onClick={generateBracketImage}
              disabled={!isBracketComplete() || isGeneratingImage}
              className={
                isBracketComplete() && !isGeneratingImage
                  ? "bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200"
                  : "bg-gray-700 text-gray-400 px-4 py-2 rounded font-semibold cursor-not-allowed"
              }
            >
              {isGeneratingImage
                ? "Generating..."
                : isBracketComplete()
                  ? "Create Bracket Image"
                  : "Finish all knockout picks first"}
            </button>
          </div>
        </section>
      )}

      {generatedBracketImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-3xl w-full bg-black border border-white p-4">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Your Bracket Image
            </h3>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedBracketImage}
              alt="Generated bracket preview"
              className="max-h-[70vh] w-full object-contain border border-gray-700"
            />

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={downloadBracketImage}
                className="bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200"
              >
                Download Image
              </button>

              <button
                onClick={() => setGeneratedBracketImage("")}
                className="bg-gray-700 text-white px-4 py-2 rounded font-semibold hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </main>
  );
}