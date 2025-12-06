import { Clock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function PendingApproval() {
  const { logout, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao Sistema!</CardTitle>
          <CardDescription>
            Olá{profile?.name ? `, ${profile.name}` : ''}! Seu cadastro foi realizado com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Aguardando Aprovação</p>
                <p className="text-sm text-muted-foreground">
                  Por motivos de segurança, seu acesso precisa ser aprovado por um administrador do sistema.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Notificação por E-mail</p>
                <p className="text-sm text-muted-foreground">
                  Você receberá uma notificação assim que seu acesso for liberado.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
          </p>

          <Button onClick={logout} variant="outline" className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
