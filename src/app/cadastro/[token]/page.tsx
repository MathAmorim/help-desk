import { validateInviteToken, getExistingSectors } from "@/app/actions/invites";
import RegisterForm from "./RegisterForm";
import { AlertCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logoCpd from "@/assets/images/LogoCPD.png";
import bgDesktop from "@/assets/images/acreuna_blueprint-dt.webp";
import bgMobile from "@/assets/images/acreuna_blueprint-ph.webp";

export default async function RegistrationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const { valid, error } = await validateInviteToken(token);
    
    const sectors = await getExistingSectors();

    if (!valid) {
        return (
            <div className="flex min-h-[100dvh] w-full flex-col relative overflow-hidden text-center">
                <Image
                    src={bgDesktop}
                    alt=""
                    fill
                    priority
                    placeholder="blur"
                    className="hidden md:block object-cover object-center -z-10"
                />
                <Image
                    src={bgMobile}
                    alt=""
                    fill
                    priority
                    placeholder="blur"
                    className="block md:hidden object-cover object-center -z-10"
                />
                
                <div className="flex flex-1 items-center justify-center p-4 relative z-10 bg-slate-950/20 backdrop-blur-[1px]">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md border-t-4 border-t-red-600">
                        <div className="flex justify-center -mt-4 mb-4">
                            <Image
                                src={logoCpd}
                                alt="Logo CPD"
                                width={80}
                                height={80}
                                className="w-auto h-16 object-contain opacity-70 grayscale"
                            />
                        </div>
                        <div className="bg-red-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-3">Link de Cadastro Inválido</h1>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            {error || "O link de cadastro que você tentou acessar não é mais válido, já foi utilizado ou expirou."}
                        </p>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                                <Link href="/login" className="w-full">
                                    <Button variant="outline" className="w-full h-11 border-slate-300 bg-white hover:bg-slate-50">
                                        Ir para página de Login
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[100dvh] w-full flex-col relative overflow-hidden">
            <Image
                src={bgDesktop}
                alt=""
                fill
                priority
                placeholder="blur"
                className="hidden md:block object-cover object-center -z-10"
            />
            <Image
                src={bgMobile}
                alt=""
                fill
                priority
                placeholder="blur"
                className="block md:hidden object-cover object-center -z-10"
            />
            
            <div className="flex flex-1 items-center justify-center p-4 relative z-10 bg-slate-950/20 backdrop-blur-[1px]">
                <div className="max-w-lg w-full mx-auto flex flex-col items-center">                 
                    <RegisterForm token={token} sectors={sectors} />
                </div>
            </div>
        </div>
    );
}
