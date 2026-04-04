"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCcw, Home, Gamepad2, LogIn } from "lucide-react";
import Link from "next/link";
import { saveSnakeScore, getLeaderboard } from "@/app/actions/snake";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_SPEED = 150;

export default function SnakeGame() {
    const { data: session } = useSession();
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const generateFood = useCallback(() => {
        let newFood: { x: number; y: number };
        const currentSnake = snake as { x: number; y: number }[];
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            // Ensure food is not on snake body
            if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) break;
        }
        setFood(newFood);
    }, [snake]);

    const moveSnake = useCallback(() => {
        if (gameOver) return;

        setSnake(prevSnake => {
            const head = { ...prevSnake[0] };
            head.x += direction.x;
            head.y += direction.y;

            // Check walls
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                setGameOver(true);
                return prevSnake;
            }

            // Check self collision
            if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
                setGameOver(true);
                return prevSnake;
            }

            const newSnake = [head, ...prevSnake];

            // Check food
            if (head.x === food.x && head.y === food.y) {
                setScore(s => s + 10);
                generateFood();
            } else {
                newSnake.pop();
            }

            return newSnake;
        });
    }, [direction, food, gameOver, generateFood]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp": if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
                case "ArrowDown": if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
                case "ArrowLeft": if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
                case "ArrowRight": if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
            }
        };
        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [direction]);

    useEffect(() => {
        gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED - Math.min(score / 2, 100));
        return () => clearInterval(gameLoopRef.current);
    }, [moveSnake, score]);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        const data = await getLeaderboard();
        setLeaderboard(data);
    };

    const handleRestart = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameOver(false);
        generateFood();
    };

    const handleSaveScore = async () => {
        if (!session) {
            toast.error("Acesso Negado", {
                description: "Apenas usuários logados podem salvar o score."
            });
            return;
        }

        setIsSaving(true);
        const result = await saveSnakeScore(score);

        if (result.success) {
            toast.success("Score Registrado!", {
                description: "Sua pontuação foi guardada nos arquivos secretos."
            });
            await fetchLeaderboard();
        } else {
            toast.error("Falha na Sincronização", {
                description: result.error || "Ocorreu um erro ao salvar."
            });
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-[100dvh] bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-mono">
            <h1 className="text-4xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center gap-3">
                <Gamepad2 className="h-10 w-10 text-emerald-400" />
                SNAKE PROTOCOL
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 w-full max-w-6xl">
                {/* Game Board */}
                <div className="lg:col-span-2 flex flex-col items-center space-y-6">
                    <div className="relative border-4 border-emerald-900/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                        <div
                            className="bg-neutral-900 grid"
                            style={{
                                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                                width: 'min(80vw, 500px)',
                                height: 'min(80vw, 500px)'
                            }}
                        >
                            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                                const x = i % GRID_SIZE;
                                const y = Math.floor(i / GRID_SIZE);
                                const isSnakeHead = snake[0].x === x && snake[0].y === y;
                                const isSnakeBody = snake.slice(1).some(s => s.x === x && s.y === y);
                                const isFood = food.x === x && food.y === y;

                                return (
                                    <div
                                        key={i}
                                        className={`transition-all duration-100 ${isSnakeHead ? "bg-emerald-400 rounded-sm scale-110 z-10" :
                                            isSnakeBody ? "bg-emerald-600/80 rounded-[1px] scale-90" :
                                                isFood ? "bg-red-500 rounded-full animate-bounce" : ""
                                            }`}
                                    />
                                );
                            })}
                        </div>

                        {gameOver && (
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
                                <h2 className="text-5xl font-black text-red-500 mb-2 font-mono">GAME OVER</h2>
                                <p className="text-xl mb-6 text-neutral-400 font-bold uppercase tracking-widest">Score Final: {score}</p>
                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                    <Button onClick={handleRestart} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold uppercase tracking-tighter">
                                        <RefreshCcw className="h-5 w-5" /> Tentar Novamente
                                    </Button>

                                    {session && (
                                        <Button
                                            onClick={handleSaveScore}
                                            disabled={isSaving || score === 0}
                                            size="lg"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold uppercase tracking-tighter"
                                        >
                                            {isSaving ? "Salvando..." : "Salvar no Ranking"}
                                        </Button>
                                    )}

                                    {!session && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-red-400 animate-pulse uppercase font-black">Identificação necessária para rankeamento</p>
                                            <Link href="/login" className="w-full block">
                                                <Button size="lg" variant="destructive" className="w-full gap-2 font-bold bg-red-900/50 hover:bg-red-800 border border-red-500 uppercase tracking-tighter shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                                    <LogIn className="h-5 w-5" /> Entrar no Sistema
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between w-full max-w-[500px] bg-neutral-900 p-4 rounded-lg border border-emerald-900/30">
                        <div className="text-lg uppercase font-black tracking-tighter">Pontos: <span className="text-emerald-400">{score}</span></div>
                        <div className="text-neutral-500 text-sm flex items-center gap-2 italic">Use as setas para controlar</div>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-emerald-400 uppercase tracking-wider">
                            <Trophy className="h-5 w-5" /> Ranking de Intrusos
                        </h2>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? (
                                <p className="text-neutral-600 italic">Nenhum registro encontrado nos arquivos...</p>
                            ) : (
                                leaderboard.map((item, index) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors border border-transparent hover:border-emerald-900/30">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                                                index === 1 ? "bg-slate-400 text-black" :
                                                    index === 2 ? "bg-amber-800 text-white" : "bg-neutral-700 text-neutral-400"
                                                }`}>
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-neutral-300">
                                                {item.user?.name || item.guestName}
                                            </span>
                                        </div>
                                        <span className="font-black text-emerald-400">{item.score}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Link href="/dashboard" className="block text-center p-4 rounded-xl border border-neutral-800 hover:bg-neutral-900 text-neutral-400 transition-all gap-2 group">
                        <Home className="h-4 w-4 inline mr-2 group-hover:text-emerald-400 transition-colors" /> Sair do Terminal Secreto
                    </Link>
                </div>
            </div>
        </div>
    );
}
