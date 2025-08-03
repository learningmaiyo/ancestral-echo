import { Users, Heart, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-heritage-deep text-white py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-heritage rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Digital Storyteller</span>
            </div>
            <p className="text-white/80 leading-relaxed">
              Preserving family legacies through the power of AI and voice technology. 
              Connect generations and keep stories alive forever.
            </p>
            <div className="flex items-center gap-2 text-heritage-gold">
              <Heart className="w-4 h-4" />
              <span className="text-sm">Built with love for families</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-white/80">
              <li><a href="#features" className="hover:text-heritage-gold transition-colors">How It Works</a></li>
              <li><a href="#demo" className="hover:text-heritage-gold transition-colors">Demo</a></li>
              <li><a href="#pricing" className="hover:text-heritage-gold transition-colors">Pricing</a></li>
              <li><a href="#faq" className="hover:text-heritage-gold transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-white/80">
              <li><a href="#help" className="hover:text-heritage-gold transition-colors">Help Center</a></li>
              <li><a href="#privacy" className="hover:text-heritage-gold transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-heritage-gold transition-colors">Terms of Service</a></li>
              <li><a href="#security" className="hover:text-heritage-gold transition-colors">Security</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-white/80">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-heritage-gold" />
                <span>hello@digitalstoryteller.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-heritage-gold" />
                <span>1-800-STORIES</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-heritage-gold" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/60 text-sm">
            © 2024 Digital Storyteller. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Made with ❤️ for families worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};