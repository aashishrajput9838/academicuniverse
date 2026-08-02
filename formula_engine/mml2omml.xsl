<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:mml="http://www.w3.org/1998/Math/MathML"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  exclude-result-prefixes="mml">

  <xsl:output method="xml" encoding="utf-8" omit-xml-declaration="yes" indent="no"/>

  <!-- Root MathML element -> OMML <m:oMath> -->
  <xsl:template match="mml:math">
    <m:oMath>
      <xsl:apply-templates/>
    </m:oMath>
  </xsl:template>

  <!-- Fractions: <mml:mfrac> -> <m:f> -->
  <xsl:template match="mml:mfrac">
    <m:f>
      <m:num>
        <xsl:apply-templates select="*[1]"/>
      </m:num>
      <m:den>
        <xsl:apply-templates select="*[2]"/>
      </m:den>
    </m:f>
  </xsl:template>

  <!-- Subscripts: <mml:msub> -> <m:sSub> -->
  <xsl:template match="mml:msub">
    <m:sSub>
      <m:e>
        <xsl:apply-templates select="*[1]"/>
      </m:e>
      <m:sub>
        <xsl:apply-templates select="*[2]"/>
      </m:sub>
    </m:sSub>
  </xsl:template>

  <!-- Superscripts: <mml:msup> -> <m:sSup> -->
  <xsl:template match="mml:msup">
    <m:sSup>
      <m:e>
        <xsl:apply-templates select="*[1]"/>
      </m:e>
      <m:sup>
        <xsl:apply-templates select="*[2]"/>
      </m:sup>
    </m:sSup>
  </xsl:template>

  <!-- Sub-Superscripts: <mml:msubsup> -> <m:sSubSup> -->
  <xsl:template match="mml:msubsup">
    <m:sSubSup>
      <m:e>
        <xsl:apply-templates select="*[1]"/>
      </m:e>
      <m:sub>
        <xsl:apply-templates select="*[2]"/>
      </m:sub>
      <m:sup>
        <xsl:apply-templates select="*[3]"/>
      </m:sup>
    </m:sSubSup>
  </xsl:template>

  <!-- Radicals / Square Roots: <mml:msqrt> -> <m:rad> -->
  <xsl:template match="mml:msqrt">
    <m:rad>
      <m:radPr>
        <m:degHide m:val="1"/>
      </m:radPr>
      <m:deg/>
      <m:e>
        <xsl:apply-templates/>
      </m:e>
    </m:rad>
  </xsl:template>

  <!-- N-th Roots: <mml:mroot> -> <m:rad> -->
  <xsl:template match="mml:mroot">
    <m:rad>
      <m:radPr>
        <m:degHide m:val="0"/>
      </m:radPr>
      <m:deg>
        <xsl:apply-templates select="*[2]"/>
      </m:deg>
      <m:e>
        <xsl:apply-templates select="*[1]"/>
      </m:e>
    </m:rad>
  </xsl:template>

  <!-- Under/Over (Limits & Summations): <mml:munderover> or <mml:munder> -> <m:nary> -->
  <xsl:template match="mml:munderover | mml:munder">
    <m:nary>
      <m:naryPr>
        <m:chr m:val="∑"/>
        <m:limLoc m:val="undOvr"/>
      </m:naryPr>
      <m:sub>
        <xsl:apply-templates select="*[2]"/>
      </m:sub>
      <m:sup>
        <xsl:apply-templates select="*[3]"/>
      </m:sup>
      <m:e>
        <xsl:apply-templates select="*[1]"/>
      </m:e>
    </m:nary>
  </xsl:template>

  <!-- Text / Identifiers / Numbers / Operators: <mml:mi>, <mml:mo>, <mml:mn>, <mml:mtext> -> <m:r><m:t> -->
  <xsl:template match="mml:mi | mml:mo | mml:mn | mml:mtext">
    <m:r>
      <m:rPr>
        <m:sty m:val="p"/>
      </m:rPr>
      <m:t>
        <xsl:value-of select="."/>
      </m:t>
    </m:r>
  </xsl:template>

  <!-- Pass through rows: <mml:mrow> -->
  <xsl:template match="mml:mrow">
    <xsl:apply-templates/>
  </xsl:template>

</xsl:stylesheet>
