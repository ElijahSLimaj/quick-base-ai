import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Upload, MessageCircle, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { ContactForm } from "@/components/ContactForm"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">QuickBase AI</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="secondary" className="px-6">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-8 leading-tight">
              Turn any platform into instant answers
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              QuickBase AI converts your websites, SaaS docs, ecommerce content, and documents into a smart support widget that answers customer questions 24/7—without writing a single FAQ.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl">
                  Start 7-Day Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-2 hover:bg-gray-50">
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              How it works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get your AI support widget up and running in minutes, not hours
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">Upload or Crawl</CardTitle>
                <CardDescription className="text-gray-600">
                  Crawl websites, SaaS docs, ecommerce sites, or upload PDFs, Word docs, and text files. QuickBase AI ingests everything automatically.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">Instant AI Widget</CardTitle>
                <CardDescription className="text-gray-600">
                  Get a copy-paste script to add a floating chat assistant to any page.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">Trusted Answers</CardTitle>
                <CardDescription className="text-gray-600">
                  Every reply includes source citations for transparency and credibility.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold">Always Fresh</CardTitle>
                <CardDescription className="text-gray-600">
                  Automatic re-crawls keep your content up to date across all platforms with zero maintenance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="bg-gradient-to-br from-gray-50 to-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
              Simple pricing for growing teams
            </h2>
            <p className="text-lg text-gray-600 mb-16 max-w-2xl mx-auto">
              All plans include a 7-day free trial. No credit card required.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Starter</CardTitle>
                  <div className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    $19<span className="text-xl font-normal text-gray-500">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 text-left mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">1 site</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">2,000 answers/month</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Basic analytics</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Email support</span>
                    </li>
                  </ul>
                  <Link href="/signup">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                      Start 7-Day Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ring-2 ring-blue-500 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <CardHeader className="text-center pb-6 pt-8">
                  <CardTitle className="text-2xl font-bold text-gray-900">Pro</CardTitle>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    $49<span className="text-xl font-normal text-gray-500">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 text-left mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">3 sites</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">10,000 answers/month</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Custom branding</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Priority support</span>
                    </li>
                  </ul>
                  <Link href="/signup">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                      Start 7-Day Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Enterprise</CardTitle>
                  <div className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Custom
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 text-left mb-8">
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Unlimited sites</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Custom limits</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">White-labeling</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">Dedicated support</span>
                    </li>
                  </ul>
                  <ContactForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join hundreds of teams already using QuickBase AI to provide instant support across websites, SaaS platforms, and ecommerce stores.
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-lg px-10 py-4 bg-white text-blue-600 hover:bg-gray-50 shadow-xl">
                Start Your 7-Day Free Trial
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">QB</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">QuickBase AI</span>
            </div>
            <div className="text-gray-400">
              © 2024 QuickBase AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}