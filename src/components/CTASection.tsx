import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Users, Clock, ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <div className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        {/* Main CTA */}
        <Card className="bg-gradient-heritage border-0 shadow-heritage text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-heritage-gold/20 to-heritage-warm/20" />
          <CardContent className="relative z-10 py-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Preserving Your Family's Legacy Today
            </h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Don't let precious stories fade away. Begin recording your family's wisdom 
              and create lasting connections for future generations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="secondary" 
                size="lg" 
                className="text-lg px-8 py-6 bg-white text-heritage-deep hover:bg-white/90 shadow-warm"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Free Recording
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10"
              >
                View Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <Card className="bg-white border-heritage-soft shadow-soft hover:shadow-warm transition-all duration-300 text-center">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 mx-auto bg-gradient-heritage rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-heritage-deep">Quick Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Start recording in minutes. No technical expertise required - 
                just your family's stories and our guided process.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-heritage-soft shadow-soft hover:shadow-warm transition-all duration-300 text-center">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 mx-auto bg-heritage-warm rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-heritage-deep">Unlimited Family</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Record as many family members as you want. Build a complete 
                digital family tree spanning multiple generations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-white border-heritage-soft shadow-soft hover:shadow-warm transition-all duration-300 text-center">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 mx-auto bg-gradient-heritage rounded-full flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-heritage-deep">Their Real Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Advanced AI voice cloning preserves the unique sound, tone, 
                and speaking patterns that make your loved ones special.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">Trusted by families worldwide</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-heritage-deep">10,000+</div>
            <div className="text-sm text-muted-foreground">Stories Preserved</div>
            <div className="w-px h-8 bg-border" />
            <div className="text-2xl font-bold text-heritage-deep">50+</div>
            <div className="text-sm text-muted-foreground">Countries</div>
            <div className="w-px h-8 bg-border" />
            <div className="text-2xl font-bold text-heritage-deep">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
};