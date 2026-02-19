import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Shield, Building2, FileSpreadsheet, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ResultHub</span>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm">Admin Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 md:py-32 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <Shield className="h-3.5 w-3.5" />
              Secure & Multi-Tenant Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
              Publish Student Results
              <br />
              <span className="text-primary">With Confidence</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground mb-8">
              A modern platform for institutions to publish exam results securely. Students look up results instantly using their register number and secret code.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-card py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { icon: Building2, title: "Institutions Onboard", desc: "Super admins create institutions with unique slugs. Each gets its own branded result page." },
                { icon: FileSpreadsheet, title: "Upload Results", desc: "Institution admins upload CSV/Excel files with student marks. Preview and publish in one click." },
                { icon: GraduationCap, title: "Students Check Results", desc: "Students visit the institution's page, enter register number and secret code to view results instantly." },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border bg-background p-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ResultHub. Built for institutions.
      </footer>
    </div>
  );
};

export default Index;
