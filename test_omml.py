import docx
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc = docx.Document()
p = doc.add_paragraph()

# Native OMML math equation test
omml_xml = f'''
<m:oMathPara {nsdecls("m")}>
  <m:oMath>
    <m:r><m:t>μ</m:t></m:r>
    <m:sSub>
      <m:e><m:r><m:t></m:t></m:r></m:e>
      <m:sub><m:r><m:t>v</m:t></m:r></m:sub>
    </m:sSub>
    <m:r><m:t> = </m:t></m:r>
    <m:f>
      <m:num>
        <m:r><m:t>S(t₂)</m:t></m:r>
        <m:r><m:t> - </m:t></m:r>
        <m:r><m:t>S(t₁)</m:t></m:r>
      </m:num>
      <m:den>
        <m:r><m:t>Δt</m:t></m:r>
      </m:den>
    </m:f>
  </m:oMath>
</m:oMathPara>
'''

p._p.append(parse_xml(omml_xml))
doc.save("test_omml.docx")
print("OMML XML test saved successfully!")
